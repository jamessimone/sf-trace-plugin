import { expect } from 'chai';

import Trace from '../core/commands/apex/trace.js';

describe('trace plugin', () => {
  it('throws an exception when target-org is not provided & no default org is set', async () => {
    let thrownError: Error;
    try {
      await Trace.run([]);
    } catch (ex: unknown) {
      thrownError = ex as Error;
    }
    expect(thrownError?.name).to.equal('NoDefaultEnvError');
    expect(thrownError?.message).to.equal(
      'No default environment found. Use -o or --target-org to specify an environment.'
    );
  });
});
