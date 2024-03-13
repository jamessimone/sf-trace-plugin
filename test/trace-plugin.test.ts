import { expect } from 'chai';
import { ArgOutput, CustomOptions, FlagOutput, Input, OptionFlag } from '@oclif/core/lib/interfaces/parser.js';
import { Org } from '@salesforce/core';

import { Dependencies, DependencyMapper, ExpectedFlags } from '../core/dependencies/dependencyMapper.js';
import Trace from '../core/commands/apex/trace.js';

class FakeDependencyMapper implements DependencyMapper {
  public passedFlags: ExpectedFlags;

  getDependencies(options: Input<FlagOutput, FlagOutput, ArgOutput>): Promise<Dependencies> {
    this.passedFlags = options.flags as ExpectedFlags;

    return Promise.resolve({
      org: {} as unknown as any,
      debugLevel: 'DEBUG',
      traceDuration: '1hr'
    });
  }
}

describe('trace plugin', () => {
  it('passes the right flags', async () => {
    const depMapper = new FakeDependencyMapper();
    Trace.dependencyMapper = depMapper;

    await Trace.run();

    const debugLevel: OptionFlag<string, CustomOptions> = depMapper.passedFlags['debug-level'];
    expect(debugLevel).not.to.equal(undefined);
    expect(debugLevel.required).to.be.true;
    expect(debugLevel.char).to.eq('l');
    expect(debugLevel.default).to.eq('DEBUG');
    const targetOrg: OptionFlag<Org, CustomOptions> = depMapper.passedFlags['target-org'];
    expect(targetOrg).not.to.equal(undefined);
    expect(targetOrg.required).to.be.false;
    expect(targetOrg.char).to.eq('o');
    const traceDuration: OptionFlag<string, CustomOptions> = depMapper.passedFlags['trace-duration'];
    expect(traceDuration).not.to.equal(undefined);
    expect(traceDuration.required).to.be.false;
    expect(traceDuration.char).to.eq('d');
    expect(traceDuration.default).to.eq('1hr');
  });
});
