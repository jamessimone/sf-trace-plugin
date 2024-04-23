import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { ActualDebugMapper, escapeXml, getQuotedQueryVar } from '../../dependencies/dependencyMapper.js';
export default class Debug extends SfCommand {
    static dependencyMapper;
    static flags = {
        'target-org': Flags.requiredOrg({
            char: 'o',
            description: 'The org where the lightning debug session will be set',
            required: false,
            summary: 'The org where the lightning debug session will be set'
        }),
        'target-user': Flags.string({
            char: 'u',
            description: 'The user the lightning debug session should be set for, when not you',
            required: false,
            summary: 'The username of the user the lightning debug session should be set for, when not the currently authorized user'
        })
    };
    async run() {
        if (!Debug.dependencyMapper) {
            Debug.dependencyMapper = new ActualDebugMapper(this.argv, this.config);
        }
        const { org, targetUser } = await Debug.dependencyMapper.getDependencies(Debug);
        const escapedUser = escapeXml(targetUser ?? org.getConnection().getUsername());
        const actualUser = (await org
            .getConnection()
            .singleRecordQuery(`SELECT Id, UserPreferencesUserDebugModePref FROM User WHERE Username = ${getQuotedQueryVar(escapedUser)}`));
        actualUser.UserPreferencesUserDebugModePref = !actualUser.UserPreferencesUserDebugModePref;
        this.log(`sf-trace: Toggling Lightning Debug Mode to ${actualUser.UserPreferencesUserDebugModePref} for ${escapedUser}`);
        org.getConnection().update('User', actualUser);
    }
}
//# sourceMappingURL=debug.js.map