import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { QueryResult } from 'jsforce';

import { ActualMapper, DependencyMapper, ExpectedFlags } from '../../dependencies/dependencyMapper.js';

const xmlCharMap: { [index: string]: string } = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '"': '&quot;',
  "'": '&apos;'
};

/**
 * > One SFDC_DevConsole debug level is shared by all DEVELOPER_LOG trace flags in your org
 */
const DEFAULT_DEBUG_LEVEL_NAME = 'SFDC_DevConsole';
const DEFAULT_LOG_TYPE = 'USER_DEBUG';
const TRACE_SOBJECT_NAME = 'TraceFlag';

export default class Trace extends SfCommand<void> {
  public static dependencyMapper: DependencyMapper;

  public static readonly flags = {
    // TODO enable adding trace flags for ANY user as an optional arg AND for the autoproc user
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
      default: false,
      relationships: [{ type: 'none', flags: ['target-user'] }],
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

    let traceUser = Trace.escapeXml(targetUser ?? '');
    let whereField = 'Username';
    if (!traceUser) {
      traceUser = org.getUsername();
    }
    if (isAutoprocTrace) {
      traceUser = 'autoproc';
      whereField = 'Alias';
    }

    const [user, fallbackDebugLevelRes] = await Promise.all([
      orgConnection.singleRecordQuery<{ Id: string }>(
        `SELECT Id FROM User WHERE ${whereField} = ${this.getQuotedQueryVar(traceUser)}`
      ),
      orgConnection.tooling.query(
        `SELECT Id FROM DebugLevel WHERE DeveloperName = ${this.getQuotedQueryVar(Trace.escapeXml(debugLevelName))}`
      )
    ]);

    const existingDebugLevel = this.getSingleOrDefault(fallbackDebugLevelRes);
    const existingTraceFlag = this.getSingleOrDefault<{ StartDate: number; ExpirationDate: number; Id: string }>(
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

    if (existingTraceFlag !== null) {
      existingTraceFlag.StartDate = Date.now();
      existingTraceFlag.ExpirationDate = this.getExpirationDate(
        new Date(existingTraceFlag.StartDate),
        traceDuration
      ).getTime();
      this.log('Updating trace flag, expires: ' + new Date(existingTraceFlag.ExpirationDate));
      orgConnection.tooling.update(TRACE_SOBJECT_NAME, existingTraceFlag);
    } else if (existingDebugLevel !== null) {
      // TODO - handle the creation of a TraceFlag record instead
    }
  }

  private getQuotedQueryVar(val: string): string {
    return `'${val}'`;
  }

  private getSingleOrDefault<T>(toolingApiResult: QueryResult<T>) {
    if (toolingApiResult.totalSize === 0) {
      return null;
    }
    return toolingApiResult.records[0];
  }

  private getExpirationDate(startingDate: Date, durationExpression: string): Date {
    const minutesInMilliseconds = 60 * 1000;
    let durationModifier = 0;
    if (durationExpression.endsWith('hr')) {
      const hours = Number(durationExpression.slice(0, durationExpression.length - 2));
      durationModifier = hours * 60 * minutesInMilliseconds;
    } else if (durationExpression.endsWith('m')) {
      durationModifier = Number(durationExpression.slice(0, durationExpression.length - 1)) * minutesInMilliseconds;
    }
    let expirationDate = new Date(startingDate.getTime() + durationModifier);
    const twentyFourHoursInMilliseconds = 24 * 60 * 60 * 1000;
    if (expirationDate.getTime() - startingDate.getTime() > twentyFourHoursInMilliseconds) {
      expirationDate = new Date(startingDate.getTime() + twentyFourHoursInMilliseconds);
    }
    return expirationDate;
  }

  // from https://github.com/forcedotcom/salesforcedx-apex/blob/main/src/utils/authUtil.ts
  private static escapeXml(data: string): string {
    return data.replace(/[<>&'"]/g, char => xmlCharMap[char]);
  }
}
