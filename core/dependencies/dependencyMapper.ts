import { SfCommand } from '@salesforce/sf-plugins-core';
import { ArgOutput, BooleanFlag, FlagOutput, Input } from '@oclif/core/lib/interfaces/parser.js';
import { CustomOptions, OptionFlag } from '@oclif/core/lib/interfaces/parser.js';
import { Org, SfError } from '@salesforce/core';

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

const XML_CHAR_MAP: { [index: string]: string } = {
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
export const escapeXml = (data: string | undefined) => {
  return data ? data.replace(/[<>&'"]/g, char => XML_CHAR_MAP[char]) : '';
};

export const getQuotedQueryVar = (val: string | undefined): string => {
  if (!val) {
    throw new SfError('Cannot query an undefined value');
  }
  return `'${val}'`;
};

export class ActualDebugMapper extends SfCommand<void> implements DependencyMapper<DebugDependencies> {
  public async getDependencies(options: Input<FlagOutput, FlagOutput, ArgOutput>): Promise<DebugDependencies> {
    const passedFlags = options.flags as ExpectedTraceFlags;
    const { flags } = await this.parse(options);

    return {
      org: flags[passedFlags['target-org'].name],
      targetUser: flags[passedFlags['target-user'].name]
    };
  }
  public async run() {}
}

export class ActualTraceMapper extends SfCommand<void> implements DependencyMapper<TraceDependencies> {
  public async getDependencies(options: Input<FlagOutput, FlagOutput, ArgOutput>): Promise<TraceDependencies> {
    const passedFlags = options.flags as ExpectedTraceFlags;
    const { flags } = await this.parse(options);

    return {
      debugLevelName: flags[passedFlags['debug-level-name'].name],
      isAutoprocTrace: flags[passedFlags['is-autoproc-trace'].name],
      org: flags[passedFlags['target-org'].name],
      traceDuration: flags[passedFlags['trace-duration'].name],
      targetUser: flags[passedFlags['target-user'].name]
    };
  }
  public async run() {}
}
