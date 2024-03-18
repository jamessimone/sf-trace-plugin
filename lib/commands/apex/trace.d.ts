import { SfCommand } from '@salesforce/sf-plugins-core';
import { DependencyMapper, ExpectedFlags } from '../../dependencies/dependencyMapper.js';
export default class Trace extends SfCommand<void> {
    static dependencyMapper: DependencyMapper;
    static readonly flags: ExpectedFlags;
    run(): Promise<void>;
    private getStartupInfo;
    private getQuotedQueryVar;
    private getSingleOrDefault;
    private getExistingTrace;
    private getExpirationDate;
    private createOrUpdateTrace;
    /**
     * from [authUtil](https://github.com/forcedotcom/salesforcedx-apex/blob/a0258ce90c3b63358ad2690e719493e3f5432f61/src/utils/authUtil.ts)
     * in the salesforcedx-apex repo
     **/
    private static escapeXml;
}
