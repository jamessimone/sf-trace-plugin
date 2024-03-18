import { SfCommand } from '@salesforce/sf-plugins-core';
export class ActualMapper extends SfCommand {
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