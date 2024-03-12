import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { ArgOutput, FlagOutput, Input } from '@oclif/core/lib/interfaces/parser.js';

export interface DependencyMapper {
  getDependencies(options?: Input<FlagOutput, FlagOutput, ArgOutput>): Promise<Dependencies>;
}

export type Dependencies = {
  debugLevel: string;
  fallbackDebugLevelName?: string;
  org: typeof Flags.requiredOrg;
  traceDuration: string;
};

export class ActualMapper extends SfCommand<void> implements DependencyMapper {
  public async getDependencies(clazz: Input<FlagOutput, FlagOutput, ArgOutput>): Promise<Dependencies> {
    const { flags } = await this.parse(clazz);
    return {
      debugLevel: 'DEBUG',
      org: flags['target-org'],
      traceDuration: '1hr'
    };
  }
  public async run() {}
}
