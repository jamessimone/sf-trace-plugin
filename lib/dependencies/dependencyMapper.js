import { SfCommand } from '@salesforce/sf-plugins-core';
import { SfError } from '@salesforce/core';
const XML_CHAR_MAP = {
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&apos;'
};
/**
 * from [authUtil](https://github.com/forcedotcom/salesforcedx-apex/blob/a0258ce90c3b63358ad2690e719493e3f5432f61/src/utils/authUtil.ts)
 * in the salesforcedx-apex repo
 **/
export const escapeXml = (data) => {
    return data ? data.replace(/[<>&'"]/g, char => XML_CHAR_MAP[char]) : '';
};
export const getQuotedQueryVar = (val) => {
    if (!val) {
        throw new SfError('Cannot query an undefined value');
    }
    return `'${val}'`;
};
export class ActualDebugMapper extends SfCommand {
    async getDependencies(options) {
        const passedFlags = options.flags;
        const { flags } = await this.parse(options);
        return {
            org: flags[passedFlags['target-org'].name],
            targetUser: flags[passedFlags['target-user'].name]
        };
    }
    async run() { }
}
export class ActualTraceMapper extends SfCommand {
    async getDependencies(options) {
        const passedFlags = options.flags;
        const { flags } = await this.parse(options);
        return {
            debugLevelName: flags[passedFlags['debug-level-name'].name],
            isAutoprocTrace: flags[passedFlags['is-autoproc-trace'].name],
            org: flags[passedFlags['target-org'].name],
            traceDuration: flags[passedFlags['trace-duration'].name],
            targetUser: flags[passedFlags['target-user'].name]
        };
    }
    async run() { }
}
//# sourceMappingURL=dependencyMapper.js.map