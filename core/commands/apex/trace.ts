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
    }),
    'debug-level': Flags.string({
      char: 'l',
      description: 'Accepted values are FINEST, FINER, FINE, DEBUG, INFO, WARN, ERROR',
      default: 'DEBUG',
      required: true,
      summary: 'Conforms to the values found in the System.LoggingLevel enum'
    }),
    'trace-duration': Flags.string({
      char: 'd',
      description: 'Defaults to 1 hour, max of 24 hours. You can set duration in minutes (eg 30m) or in hours (eg 2h)',
      default: '1hr',
      required: false,
      summary: 'How long the trace is active for'
    })
  };

  public async run(): Promise<void> {
    if (!Trace.dependencyMapper) {
      Trace.dependencyMapper = new ActualMapper(this.argv, this.config);
    }

    const { debugLevel, org } = await Trace.dependencyMapper.getDependencies(Trace);
    this.log('Org connection: ' + JSON.stringify(org));
    this.log(debugLevel);
  }
}
