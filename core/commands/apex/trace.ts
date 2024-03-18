import { Connection, SfError } from '@salesforce/core';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { QueryResult, Record } from 'jsforce';

import { ActualMapper, DependencyMapper, ExpectedFlags } from '../../dependencies/dependencyMapper.js';

/**
 * > One SFDC_DevConsole debug level is shared by all DEVELOPER_LOG trace flags in your org
 */
const DEFAULT_DEBUG_LEVEL_NAME = 'SFDC_DevConsole';
const DEFAULT_LOG_TYPE = 'USER_DEBUG';
const TRACE_SOBJECT_NAME = 'TraceFlag';
const XML_CHAR_MAP: { [index: string]: string } = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '"': '&quot;',
  "'": '&apos;'
};

export default class Trace extends SfCommand<void> {
  public static dependencyMapper: DependencyMapper;

  public static readonly flags = {
    'debug-level-name': Flags.string({
      char: 'l',
      description: 'The DeveloperName to use for the DebugLevel record',
      default: DEFAULT_DEBUG_LEVEL_NAME,
      required: false,
      summary: 'Optional - the name of the DebugLevel record to use'
    }),
    'is-autoproc-trace': Flags.boolean({
      char: 'a',
      description: 'Is the trace for the Automated Process User?',
      relationships: [{ type: 'none', flags: ['target-user'] }],
      required: false,
      summary: 'Optional - should the trace be set for the Automated Process User?'
    }),
    'target-org': Flags.requiredOrg({
      char: 'o',
      description: 'The org where the trace will be set',
      required: false,
      summary: 'The org where the trace will be set'
    }),
    'trace-duration': Flags.string({
      char: 'd',
      description: 'How long the trace is active for',
      default: '1hr',
      required: false,
      summary: 'Defaults to 1 hour, max of 24 hours. You can set duration in minutes (eg 30m) or in hours (eg 2h)'
    }),
    'target-user': Flags.string({
      char: 'u',
      description: 'The user the trace flag should be set for, when not you',
      required: false,
      relationships: [{ type: 'none', flags: ['is-autoproc-trace'] }],
      summary: 'The username of the user the trace flag should be set for, when not the currently authorized user'
    })
  } as ExpectedFlags;

  public async run(): Promise<void> {
    if (!Trace.dependencyMapper) {
      Trace.dependencyMapper = new ActualMapper(this.argv, this.config);
    }

    const { debugLevelName, isAutoprocTrace, org, traceDuration, targetUser } =
      await Trace.dependencyMapper.getDependencies(Trace);
    const orgConnection = org.getConnection();

    const { existingDebugLevel, user } = await this.getStartupInfo(
      debugLevelName,
      isAutoprocTrace,
      orgConnection,
      targetUser
    );

    const existingTraceFlag = await this.getExistingTrace(user, orgConnection);

    const baseTraceFlag = {
      DebugLevelId: existingDebugLevel.Id,
      ExpirationDate: 0,
      Id: existingTraceFlag?.Id,
      StartDate: Date.now()
    } as Record;
    baseTraceFlag.ExpirationDate = this.getExpirationDate(new Date(baseTraceFlag.StartDate), traceDuration).getTime();
    await this.createOrUpdateTrace(baseTraceFlag, user, orgConnection, existingDebugLevel);
  }

  private async getStartupInfo(
    debugLevelName: string,
    isAutoprocTrace: boolean,
    orgConnection: Connection,
    targetUser?: string
  ) {
    let traceUser = Trace.escapeXml(targetUser);
    let whereField = 'Username';
    if (!traceUser) {
      traceUser = orgConnection.getUsername() as string;
    }
    if (isAutoprocTrace) {
      traceUser = 'autoproc';
      whereField = 'Alias';
    }

    const [user, fallbackDebugLevelRes] = await Promise.all([
      orgConnection.singleRecordQuery<Record>(
        `SELECT Id FROM User WHERE ${whereField} = ${this.getQuotedQueryVar(traceUser)}`
      ),
      orgConnection.tooling.query(
        `SELECT Id, DeveloperName FROM DebugLevel WHERE DeveloperName = ${this.getQuotedQueryVar(
          Trace.escapeXml(debugLevelName)
        )}`
      )
    ]).catch(() => {
      // "singleRecordQuery" isn't Promise-like, so we can't add .catch() to it directly
      // but it throws when no matching records are found. We'll handle that outcome below
      return Promise.resolve([]);
    });

    if (!user?.Id) {
      throw new SfError(`User not found: ${traceUser}`);
    } else {
      user.Username = traceUser;
    }

    const existingDebugLevel = this.getSingleOrDefault(fallbackDebugLevelRes);
    if (!existingDebugLevel?.Id) {
      throw new SfError(`DebugLevel not found: ${debugLevelName}`);
    }
    return { existingDebugLevel, user } as { existingDebugLevel: Record; user: Record & { Username: string } };
  }

  private getQuotedQueryVar(val: string | undefined): string {
    if (!val) {
      throw new SfError('Cannot query an undefined value');
    }
    return `'${val}'`;
  }

  private getSingleOrDefault<T extends Record>(toolingApiResult: QueryResult<T>) {
    if (toolingApiResult.totalSize === 0) {
      return null;
    }
    return toolingApiResult.records[0];
  }

  private async getExistingTrace(user: Record, orgConnection: Connection) {
    return this.getSingleOrDefault<{ StartDate: number; ExpirationDate: number; Id: string }>(
      await orgConnection.tooling.query(
        `SELECT Id
          FROM ${TRACE_SOBJECT_NAME}
          WHERE LogType = ${this.getQuotedQueryVar(DEFAULT_LOG_TYPE)}
          AND TracedEntityId = ${this.getQuotedQueryVar(user.Id)}
          ORDER BY CreatedDate DESC
          LIMIT 1
        `
      )
    );
  }

  private getExpirationDate(startingDate: Date, durationExpression: string): Date {
    const oneMinuteInMilliseconds = 60 * 1000;
    let durationModifier = 0;
    if (durationExpression.endsWith('hr')) {
      const hours = Number(durationExpression.slice(0, durationExpression.length - 2));
      durationModifier = hours * 60 * oneMinuteInMilliseconds;
    } else if (durationExpression.endsWith('m')) {
      durationModifier = Number(durationExpression.slice(0, durationExpression.length - 1)) * oneMinuteInMilliseconds;
    } else {
      throw new SfError(`Invalid duration "${durationExpression}" supplied`);
    }
    let expirationDate = new Date(startingDate.getTime() + durationModifier);
    const twentyFourHoursInMilliseconds = 24 * 60 * 60 * 1000;
    if (expirationDate.getTime() - startingDate.getTime() > twentyFourHoursInMilliseconds) {
      expirationDate = new Date(startingDate.getTime() + twentyFourHoursInMilliseconds);
    }
    return expirationDate;
  }

  private async createOrUpdateTrace(
    baseTraceFlag: Record,
    user: Record,
    orgConnection: Connection,
    existingDebugLevel: Record
  ) {
    if (baseTraceFlag.Id) {
      this.log(`Updating TraceFlag for ${user.Username}, expires: ${new Date(baseTraceFlag.ExpirationDate)}`);
      await orgConnection.tooling.update(TRACE_SOBJECT_NAME, baseTraceFlag);
    } else if (existingDebugLevel !== null) {
      this.log(
        `No matching TraceFlag for user: ${user.Username}, setting one up using debug level: ${JSON.stringify(
          existingDebugLevel
        )}, expires: ${new Date(baseTraceFlag.ExpirationDate)}}`
      );
      await orgConnection.tooling.create(TRACE_SOBJECT_NAME, {
        ...baseTraceFlag,
        LogType: DEFAULT_LOG_TYPE,
        TracedEntityId: user.Id
      });
    }
  }

  /**
   * from [authUtil](https://github.com/forcedotcom/salesforcedx-apex/blob/a0258ce90c3b63358ad2690e719493e3f5432f61/src/utils/authUtil.ts)
   * in the salesforcedx-apex repo
   **/
  private static escapeXml(data: string | undefined) {
    return data ? data.replace(/[<>&'"]/g, char => XML_CHAR_MAP[char]) : '';
  }
}
