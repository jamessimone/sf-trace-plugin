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

export class ActualMapper extends SfCommand<void> implements DependencyMapper {
  public async getDependencies(options: Input<FlagOutput, FlagOutput, ArgOutput>): Promise<Dependencies> {
    const passedFlags = options.flags as ExpectedFlags;
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
