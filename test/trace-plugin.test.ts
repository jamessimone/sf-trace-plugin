import { expect } from 'chai';
import { ArgOutput, CustomOptions, FlagOutput, Input, OptionFlag } from '@oclif/core/lib/interfaces/parser.js';
import { Org } from '@salesforce/core';

import { Dependencies, DependencyMapper, ExpectedFlags } from '../core/dependencies/dependencyMapper.js';
import Trace from '../core/commands/apex/trace.js';

type SalesforceRecord = {
  Id: string;
};

type TraceFlag = SalesforceRecord & { StartDate: number; ExpirationDate: number };

class FakeDependencyMapper implements DependencyMapper {
  public passedFlags: ExpectedFlags;
  public queriesMade: string[] = [];
  public username = 'test@user.com';
  public traceDuration: string;

  public matchingUser: SalesforceRecord = { Id: '005...' };
  public matchingDebugLevel: SalesforceRecord & { DeveloperName: string } = {
    DeveloperName: 'someName',
    Id: '7dl....'
  };
  public matchingTraceFlag: SalesforceRecord = { Id: '7tf...' };
  public updatedSObjectName: string;
  public updatedTraceFlag: TraceFlag;

  getDependencies(options: Input<FlagOutput, FlagOutput, ArgOutput>): Promise<Dependencies> {
    this.passedFlags = options.flags as ExpectedFlags;
    this.traceDuration = this.traceDuration ?? this.passedFlags['trace-duration'].default.toString();

    return Promise.resolve({
      org: {
        getUsername: () => this.username,
        getConnection: () => ({
          singleRecordQuery: (query: string) => {
            this.queriesMade.push(query);
            return this.matchingUser;
          },
          tooling: {
            query: (query: string) => {
              this.queriesMade.push(query);
              let matchingRecord = null;
              if (query.indexOf('FROM DebugLevel') > -1) {
                matchingRecord = this.matchingDebugLevel;
              } else if (query.indexOf('FROM TraceFlag') > -1) {
                matchingRecord = this.matchingTraceFlag;
              }
              return { totalSize: 1, records: matchingRecord ? [matchingRecord] : null };
            },
            update: (sObjectName: string, record: TraceFlag) => {
              this.updatedSObjectName = sObjectName;
              this.updatedTraceFlag = record;
            }
          }
        })
      } as unknown as Org,
      debugLevelName: 'someName',
      traceDuration: this.traceDuration
    });
  }
}

describe('trace plugin', () => {
  it('passes the right flags', async () => {
    const depMapper = new FakeDependencyMapper();
    Trace.dependencyMapper = depMapper;

    await Trace.run();

    const debugLevel: OptionFlag<string, CustomOptions> = depMapper.passedFlags['debug-level-name'];
    expect(debugLevel).not.to.equal(undefined);
    expect(debugLevel.required).to.be.false;
    expect(debugLevel.char).to.eq('l');
    expect(debugLevel.default).to.eq('SFDC_DevConsole');
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

  it('updates an existing trace flag for the current user with default duration', async () => {
    const depMapper = new FakeDependencyMapper();
    Trace.dependencyMapper = depMapper;
    const nowish = Date.now();

    await Trace.run();

    expect(depMapper.queriesMade.length).to.eq(3);
    expect(depMapper.queriesMade[0]).to.eq(`SELECT Id FROM User WHERE Username = '${depMapper.username}'`);
    expect(depMapper.queriesMade[1]).to.eq(
      `SELECT Id FROM DebugLevel WHERE DeveloperName = '${depMapper.matchingDebugLevel.DeveloperName}'`
    );
    expect(depMapper.queriesMade[2]).to.eq(
      `SELECT Id
          FROM TraceFlag
          WHERE LogType = 'USER_DEBUG'
          AND TracedEntityId = '${depMapper.matchingUser.Id}'
          ORDER BY CreatedDate DESC
          LIMIT 1
        `
    );
    expect(depMapper.updatedSObjectName).to.eq('TraceFlag');
    expect(depMapper.updatedTraceFlag.StartDate).to.be.lessThan(depMapper.updatedTraceFlag.ExpirationDate);
    const nowishDate = new Date(nowish);
    const expirationate = new Date(depMapper.updatedTraceFlag.ExpirationDate);
    expirationate.setSeconds(0);
    expirationate.setMilliseconds(0);
    nowishDate.setSeconds(0);
    nowishDate.setMilliseconds(0);
    expect(expirationate.getTime()).to.eq(nowishDate.getTime() + 1000 * 60 * 60);
  });

  it('updates an existing trace flag for the current user with minute duration', async () => {
    const depMapper = new FakeDependencyMapper();
    Trace.dependencyMapper = depMapper;
    depMapper.traceDuration = '15m';
    const nowish = Date.now();

    await Trace.run();

    const expirationate = new Date(depMapper.updatedTraceFlag.ExpirationDate);
    expirationate.setSeconds(0);
    expirationate.setMilliseconds(0);
    const nowishDate = new Date(nowish);
    nowishDate.setSeconds(0);
    nowishDate.setMilliseconds(0);
    expect(expirationate.getTime()).to.eq(nowishDate.getTime() + 1000 * 15 * 60);
  });

  it('sets a max of 24 hours tracing time when more than that is passed in as the trace duration', async () => {
    const depMapper = new FakeDependencyMapper();
    Trace.dependencyMapper = depMapper;
    depMapper.traceDuration = '50hr';
    const nowish = Date.now();

    await Trace.run();

    const expirationate = new Date(depMapper.updatedTraceFlag.ExpirationDate);
    expirationate.setSeconds(0);
    expirationate.setMilliseconds(0);
    const nowishDate = new Date(nowish);
    nowishDate.setSeconds(0);
    nowishDate.setMilliseconds(0);
    expect(expirationate.getTime()).to.eq(nowishDate.getTime() + 1000 * 60 * 60 * 24);
  });
});
