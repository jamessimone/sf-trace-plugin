import { Flags, SfCommand } from '@salesforce/sf-plugins-core';

export default class Trace extends SfCommand<void> {
  public static readonly flags = {
    'target-org': Flags.requiredOrg({
      char: 'o',
      description: 'The org where the trace will be set',
      required: false,
      summary: 'The org where the trace will be set'
    })
  };

  public async run(): Promise<void> {
    // Flags are only validated when this.parse is called
    await this.parse(Trace);
    throw new Error('Method not implemented.');
  }
}
