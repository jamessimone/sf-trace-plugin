import { SfCommand } from '@salesforce/sf-plugins-core';
import { ArgOutput, BooleanFlag, FlagOutput, Input } from '@oclif/core/lib/interfaces/parser.js';
import { CustomOptions, OptionFlag } from '@oclif/core/lib/interfaces/parser.js';
import { Org } from '@salesforce/core';
export interface DependencyMapper<T> {
    getDependencies(options: Input<FlagOutput, FlagOutput, ArgOutput>): Promise<T>;
}
export type DebugDependencies = {
    org: Org;
    targetUser?: string;
};
export type ExpectedDebugFlags = {
    'target-org': OptionFlag<Org, CustomOptions>;
    'target-user': OptionFlag<string, CustomOptions>;
};
export type ExpectedTraceFlags = ExpectedDebugFlags & {
    'debug-level-name': OptionFlag<string, CustomOptions>;
    'is-autoproc-trace': BooleanFlag<CustomOptions>;
    'trace-duration': OptionFlag<string, CustomOptions>;
};
export type TraceDependencies = DebugDependencies & {
    debugLevelName: string;
    isAutoprocTrace: boolean;
    traceDuration: string;
};
/**
 * from [authUtil](https://github.com/forcedotcom/salesforcedx-apex/blob/a0258ce90c3b63358ad2690e719493e3f5432f61/src/utils/authUtil.ts)
 * in the salesforcedx-apex repo
 **/
export declare const escapeXml: (data: string | undefined) => string;
export declare const getQuotedQueryVar: (val: string | undefined) => string;
export declare class ActualDebugMapper extends SfCommand<void> implements DependencyMapper<DebugDependencies> {
    getDependencies(options: Input<FlagOutput, FlagOutput, ArgOutput>): Promise<DebugDependencies>;
    run(): Promise<void>;
}
export declare class ActualTraceMapper extends SfCommand<void> implements DependencyMapper<TraceDependencies> {
    getDependencies(options: Input<FlagOutput, FlagOutput, ArgOutput>): Promise<TraceDependencies>;
    run(): Promise<void>;
}
