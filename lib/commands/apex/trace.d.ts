import { SfCommand } from '@salesforce/sf-plugins-core';
import { DependencyMapper, ExpectedTraceFlags, TraceDependencies } from '../../dependencies/dependencyMapper.js';
/**
 * > One SFDC_DevConsole debug level is shared by all DEVELOPER_LOG trace flags in your org
 */
export declare const DEFAULT_DEBUG_LEVEL_NAME = "SFDC_DevConsole";
export default class Trace extends SfCommand<void> {
    static dependencyMapper: DependencyMapper<TraceDependencies>;
    static readonly flags: ExpectedTraceFlags;
    run(): Promise<void>;
    private getStartupInfo;
    private getSingleOrDefault;
    private getExistingTrace;
    private getExpirationDate;
    private createOrUpdateTrace;
}
