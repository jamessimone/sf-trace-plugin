import { SfCommand } from '@salesforce/sf-plugins-core';
import { DebugDependencies, DependencyMapper, ExpectedDebugFlags } from '../../dependencies/dependencyMapper.js';
export default class Debug extends SfCommand<void> {
    static dependencyMapper: DependencyMapper<DebugDependencies>;
    static readonly flags: ExpectedDebugFlags;
    run(): Promise<void>;
}
