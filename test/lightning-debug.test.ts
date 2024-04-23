import { expect } from 'chai';
import { ArgOutput, CustomOptions, FlagOutput, Input, OptionFlag } from '@oclif/core/lib/interfaces/parser.js';
import { Org } from '@salesforce/core';
import { Record } from 'jsforce';

import { DebugDependencies, DependencyMapper, ExpectedDebugFlags } from '../core/dependencies/dependencyMapper.js';
import Debug from '../core/commands/lightning/debug.js';

class FakeDependencyMapper implements DependencyMapper<DebugDependencies> {
  public matchingUser: Record = { Id: '005...' };
  public passedFlags: ExpectedDebugFlags;
  public queriesMade: string[] = [];
  public username: string;

  public updateTypeName: string;
  public updatedUser: Record;

  getDependencies(options: Input<FlagOutput, FlagOutput, ArgOutput>): Promise<DebugDependencies> {
    this.passedFlags = options.flags as ExpectedDebugFlags;

    return Promise.resolve({
      org: {
        getConnection: () => ({
          getUsername: () => this.username ?? 'current@auth.com',
          singleRecordQuery: (query: string) => {
            this.queriesMade.push(query);
            return this.matchingUser;
          },
          update: (typeName: string, record: Record) => {
            this.updateTypeName = typeName;
            this.updatedUser = record;
          }
        })
      } as unknown as Org,
      targetUser: this.username
    });
  }
}

describe('lightning debug command', () => {
  let depMapper: FakeDependencyMapper;
  beforeEach(() => {
    depMapper = new FakeDependencyMapper();
    Debug.dependencyMapper = depMapper;
  });

  it('passes the right flags', async () => {
    await Debug.run();

    const targetOrg: OptionFlag<Org, CustomOptions> = depMapper.passedFlags['target-org'];
    expect(targetOrg.required).to.be.false;
    expect(targetOrg.char).to.eq('o');

    const targetUser: OptionFlag<string, CustomOptions> = depMapper.passedFlags['target-user'];
    expect(targetUser.char).to.eq('u');
    expect(targetUser.required).to.false;
  });

  it('uses current authed user when not passed as flag', async () => {
    await Debug.run();
    expect(depMapper.queriesMade[0]).to.eq(
      `SELECT Id, UserPreferencesUserDebugModePref FROM User WHERE Username = 'current@auth.com'`
    );
  });

  it('toggles debug mode to true when falsy', async () => {
    await Debug.run();

    expect(depMapper.updateTypeName).to.eq('User');
    expect(depMapper.updatedUser.UserPreferencesUserDebugModePref).to.be.true;
  });

  it('toggles debug mode to false when true', async () => {
    depMapper.matchingUser.UserPreferencesUserDebugModePref = true;

    await Debug.run();

    expect(depMapper.updateTypeName).to.eq('User');
    expect(depMapper.updatedUser.UserPreferencesUserDebugModePref).to.be.false;
  });

  it('queries for another username', async () => {
    depMapper.username = 'something@else.com';

    await Debug.run();

    expect(depMapper.queriesMade[0]).to.eq(
      `SELECT Id, UserPreferencesUserDebugModePref FROM User WHERE Username = '${depMapper.username}'`
    );
  });
});
