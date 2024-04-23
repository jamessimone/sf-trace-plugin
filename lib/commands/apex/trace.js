import { SfError } from '@salesforce/core';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { ActualTraceMapper, escapeXml, getQuotedQueryVar } from '../../dependencies/dependencyMapper.js';
/**
 * > One SFDC_DevConsole debug level is shared by all DEVELOPER_LOG trace flags in your org
 */
export const DEFAULT_DEBUG_LEVEL_NAME = 'SFDC_DevConsole';
const DEFAULT_LOG_TYPE = 'USER_DEBUG';
const TRACE_SOBJECT_NAME = 'TraceFlag';
export default class Trace extends SfCommand {
    static dependencyMapper;
    static flags = {
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
    };
    async run() {
        if (!Trace.dependencyMapper) {
            Trace.dependencyMapper = new ActualTraceMapper(this.argv, this.config);
        }
        const { debugLevelName, isAutoprocTrace, org, traceDuration, targetUser } = await Trace.dependencyMapper.getDependencies(Trace);
        const orgConnection = org.getConnection();
        const { existingDebugLevel, user } = await this.getStartupInfo(debugLevelName, isAutoprocTrace, orgConnection, targetUser);
        const existingTraceFlag = await this.getExistingTrace(user, orgConnection);
        const baseTraceFlag = {
            DebugLevelId: existingTraceFlag?.DebugLevelId ?? existingDebugLevel.Id,
            ExpirationDate: 0,
            Id: existingTraceFlag?.Id,
            StartDate: Date.now()
        };
        baseTraceFlag.ExpirationDate = this.getExpirationDate(new Date(baseTraceFlag.StartDate), traceDuration).getTime();
        await this.createOrUpdateTrace(baseTraceFlag, user, orgConnection, existingDebugLevel);
    }
    async getStartupInfo(debugLevelName, isAutoprocTrace, orgConnection, targetUser) {
        let traceUser = escapeXml(targetUser);
        let whereField = 'Username';
        if (!traceUser) {
            traceUser = orgConnection.getUsername();
        }
        if (isAutoprocTrace) {
            traceUser = 'autoproc';
            whereField = 'Alias';
        }
        const [user, fallbackDebugLevelRes] = await Promise.all([
            orgConnection.singleRecordQuery(`SELECT Id FROM User WHERE ${whereField} = ${getQuotedQueryVar(traceUser)}`),
            orgConnection.tooling.query(`SELECT Id, DeveloperName FROM DebugLevel WHERE DeveloperName = ${getQuotedQueryVar(escapeXml(debugLevelName))}`)
        ]).catch(() => {
            // "singleRecordQuery" isn't Promise-like, so we can't add .catch() to it directly
            // but it throws when no matching records are found. We'll handle that outcome below
            return Promise.resolve([]);
        });
        if (!user?.Id) {
            throw new SfError(`User not found: ${traceUser}`);
        }
        else {
            user.Username = traceUser;
        }
        let existingDebugLevel = this.getSingleOrDefault(fallbackDebugLevelRes);
        if (!existingDebugLevel?.Id) {
            existingDebugLevel = {
                ApexCode: 'FINE',
                DeveloperName: debugLevelName,
                MasterLabel: 'Created by sf-trace-plugin'
            };
            this.log(`sf-trace: Creating default DebugLevel for ${user.Username}: ${JSON.stringify(existingDebugLevel)}`);
            const saveResult = await orgConnection.tooling.create('DebugLevel', existingDebugLevel);
            existingDebugLevel.Id = saveResult?.id;
        }
        return { existingDebugLevel, user };
    }
    getSingleOrDefault(toolingApiResult) {
        if (toolingApiResult.totalSize === 0) {
            return null;
        }
        return toolingApiResult.records[0];
    }
    async getExistingTrace(user, orgConnection) {
        return this.getSingleOrDefault(await orgConnection.tooling.query(`SELECT Id, DebugLevelId
          FROM ${TRACE_SOBJECT_NAME}
          WHERE LogType = ${getQuotedQueryVar(DEFAULT_LOG_TYPE)}
          AND TracedEntityId = ${getQuotedQueryVar(user.Id)}
          ORDER BY CreatedDate DESC
          LIMIT 1
        `));
    }
    getExpirationDate(startingDate, durationExpression) {
        const oneMinuteInMilliseconds = 60 * 1000;
        let durationModifier = 0;
        if (durationExpression.endsWith('hr')) {
            const hours = Number(durationExpression.slice(0, durationExpression.length - 2));
            durationModifier = hours * 60 * oneMinuteInMilliseconds;
        }
        else if (durationExpression.endsWith('m')) {
            durationModifier = Number(durationExpression.slice(0, durationExpression.length - 1)) * oneMinuteInMilliseconds;
        }
        else {
            throw new SfError(`Invalid duration "${durationExpression}" supplied`);
        }
        let expirationDate = new Date(startingDate.getTime() + durationModifier);
        const twentyFourHoursInMilliseconds = 24 * 60 * 60 * 1000;
        if (expirationDate.getTime() - startingDate.getTime() > twentyFourHoursInMilliseconds) {
            expirationDate = new Date(startingDate.getTime() + twentyFourHoursInMilliseconds);
        }
        return expirationDate;
    }
    async createOrUpdateTrace(baseTraceFlag, user, orgConnection, existingDebugLevel) {
        if (baseTraceFlag.Id) {
            this.log(`sf-trace: Updating TraceFlag for ${user.Username}, expires: ${new Date(baseTraceFlag.ExpirationDate)}`);
            await orgConnection.tooling.update(TRACE_SOBJECT_NAME, baseTraceFlag);
        }
        else if (existingDebugLevel !== null) {
            this.log(`sf-trace: No matching TraceFlag for user: ${user.Username}, setting one up using debug level: ${JSON.stringify(existingDebugLevel)}, expires: ${new Date(baseTraceFlag.ExpirationDate)}}`);
            await orgConnection.tooling.create(TRACE_SOBJECT_NAME, {
                ...baseTraceFlag,
                LogType: DEFAULT_LOG_TYPE,
                TracedEntityId: user.Id
            });
        }
    }
}
//# sourceMappingURL=trace.js.map