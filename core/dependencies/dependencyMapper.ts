import { SfCommand } from '@salesforce/sf-plugins-core';
import { ArgOutput, FlagOutput, Input } from '@oclif/core/lib/interfaces/parser.js';
import { CustomOptions, OptionFlag } from '@oclif/core/lib/interfaces/parser.js';
import { Org } from '@salesforce/core';

export interface DependencyMapper {
  getDependencies(options: Input<FlagOutput, FlagOutput, ArgOutput>): Promise<Dependencies>;
}

export type ExpectedFlags = {
  'debug-level-name': OptionFlag<string, CustomOptions>;
  'target-org': OptionFlag<Org, CustomOptions>;
  'trace-duration': OptionFlag<string, CustomOptions>;
};

export type Dependencies = {
  debugLevelName: string;
  fallbackDebugLevelName?: string;
  org: Org;
  traceDuration: string;
};

export class ActualMapper extends SfCommand<void> implements DependencyMapper {
  public async getDependencies(options: Input<FlagOutput, FlagOutput, ArgOutput>): Promise<Dependencies> {
    const passedFlags = options.flags as ExpectedFlags;
    const { flags } = await this.parse(options);
    return {
      debugLevelName: flags[passedFlags['debug-level-name'].name],
      org: flags[passedFlags['target-org'].name],
      traceDuration: flags[passedFlags['trace-duration'].name]
    };
  }
  public async run() {}
}
