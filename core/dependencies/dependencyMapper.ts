import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { ArgOutput, FlagOutput, Input } from '@oclif/core/lib/interfaces/parser.js';
import { CustomOptions, OptionFlag } from '@oclif/core/lib/interfaces/parser.js';
import { Org } from '@salesforce/core';

export interface DependencyMapper {
  getDependencies(options: Input<FlagOutput, FlagOutput, ArgOutput>): Promise<Dependencies>;
}

export type ExpectedFlags = {
  'debug-level': OptionFlag<string, CustomOptions>;
  'target-org': OptionFlag<Org, CustomOptions>;
  'trace-duration': OptionFlag<string, CustomOptions>;
};

export type Dependencies = {
  debugLevel: string;
  fallbackDebugLevelName?: string;
  org: typeof Flags.requiredOrg;
  traceDuration: string;
};

export class ActualMapper extends SfCommand<void> implements DependencyMapper {
  public async getDependencies(options: Input<FlagOutput, FlagOutput, ArgOutput>): Promise<Dependencies> {
    const passedFlags = options.flags as ExpectedFlags;
    const { flags } = await this.parse(options);
    return {
      debugLevel: flags[passedFlags['debug-level'].name],
      org: flags[passedFlags['target-org'].name],
      traceDuration: flags[passedFlags['trace-duration'].name]
    } as Dependencies;
  }
  public async run() {}
}
