import { expect } from 'chai';

import Trace from '../core/commands/apex/trace.js';
import { Dependencies, DependencyMapper } from '../core/dependencies/dependencyMapper.js';
import { Input, FlagOutput, ArgOutput } from '@oclif/core/lib/interfaces/parser.js';

class FakeDependencyMapper implements DependencyMapper {
  getDependencies(_?: Input<FlagOutput, FlagOutput, ArgOutput>): Promise<Dependencies> {
    return Promise.resolve({
      org: {} as unknown as any,
      debugLevel: 'DEBUG',
      traceDuration: '1hr'
    });
  }
}

describe('trace plugin', () => {
  it('throws an exception when target-org is not provided & no default org is set', async () => {
    let thrownError: Error;
    try {
      await Trace.run([]);
    } catch (ex: unknown) {
      thrownError = ex as Error;
    }
    expect(thrownError?.message).to.equal(
      'No default environment found. Use -o or --target-org to specify an environment.'
    );
  });

  it('does not throw an exception when target-org is specified', async () => {
    Trace.dependencyMapper = new FakeDependencyMapper();
    await Trace.run(['--target-org', 'myOrgAlias']);
  });
});
