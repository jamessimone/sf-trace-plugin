import { Flags, SfCommand } from '@salesforce/sf-plugins-core';

import { ActualMapper, DependencyMapper } from '../../dependencies/dependencyMapper.js';

export default class Trace extends SfCommand<void> {
  public static dependencyMapper: DependencyMapper;

  public static readonly flags = {
    'target-org': Flags.requiredOrg({
      char: 'o',
      description: 'The org where the trace will be set',
      required: false,
      summary: 'The org where the trace will be set'
    })
  };

  public async run(): Promise<void> {
    if (!Trace.dependencyMapper) {
      Trace.dependencyMapper = new ActualMapper(this.argv, this.config);
    }

    const { org } = await Trace.dependencyMapper.getDependencies(Trace);
    this.log('Org connection: ' + JSON.stringify(org));

    throw new Error('Method not implemented.');
  }
}
