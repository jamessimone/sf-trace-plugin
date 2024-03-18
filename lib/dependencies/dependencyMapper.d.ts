import { SfCommand } from '@salesforce/sf-plugins-core';
import { ArgOutput, BooleanFlag, FlagOutput, Input } from '@oclif/core/lib/interfaces/parser.js';
import { CustomOptions, OptionFlag } from '@oclif/core/lib/interfaces/parser.js';
import { Org } from '@salesforce/core';
export interface DependencyMapper {
    getDependencies(options: Input<FlagOutput, FlagOutput, ArgOutput>): Promise<Dependencies>;
}
export type ExpectedFlags = {
    'debug-level-name': OptionFlag<string, CustomOptions>;
    'is-autoproc-trace': BooleanFlag<CustomOptions>;
    'target-org': OptionFlag<Org, CustomOptions>;
    'trace-duration': OptionFlag<string, CustomOptions>;
    'target-user': OptionFlag<string, CustomOptions>;
};
export type Dependencies = {
    debugLevelName: string;
    isAutoprocTrace: boolean;
    org: Org;
    traceDuration: string;
    targetUser?: string;
};
export declare class ActualMapper extends SfCommand<void> implements DependencyMapper {
    getDependencies(options: Input<FlagOutput, FlagOutput, ArgOutput>): Promise<Dependencies>;
    run(): Promise<void>;
}
