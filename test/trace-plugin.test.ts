import { expect } from 'chai';
import {
  ArgOutput,
  BooleanFlag,
  CustomOptions,
  FlagOutput,
  Input,
  OptionFlag,
  Relationship
} from '@oclif/core/lib/interfaces/parser.js';
import { Org } from '@salesforce/core';

import { Dependencies, DependencyMapper, ExpectedFlags } from '../core/dependencies/dependencyMapper.js';
import Trace, { DEFAULT_DEBUG_LEVEL_NAME } from '../core/commands/apex/trace.js';

type SalesforceRecord = {
  Id: string;
};

type TraceFlag = SalesforceRecord & { DebugLevelId: string | undefined; ExpirationDate: number; StartDate: number };

class FakeDependencyMapper implements DependencyMapper {
  public debugLevelName: string;
  public isAutoprocTrace = false;
  public matchingDebugLevel: (SalesforceRecord & { DeveloperName: string }) | undefined = {
    DeveloperName: DEFAULT_DEBUG_LEVEL_NAME,
    Id: '7dl....'
  };
  public matchingTraceFlag: (SalesforceRecord & { DebugLevelId: string | undefined }) | undefined = {
    Id: '7tf...',
    DebugLevelId: undefined
  };
  public matchingUser: SalesforceRecord | undefined = { Id: '005...' };
  public passedFlags: ExpectedFlags;
  public queriesMade: string[] = [];
  public traceDuration: string;
  public updatedRecordMap: Record<string, SalesforceRecord> = {
    DebugLevel: { Id: '' },
    TraceFlag: { Id: '' }
  };
  public username: string;

  getDependencies(options: Input<FlagOutput, FlagOutput, ArgOutput>): Promise<Dependencies> {
    this.passedFlags = options.flags as ExpectedFlags;
    this.traceDuration = this.traceDuration ?? this.passedFlags['trace-duration'].default?.toString();

    const setUpdatedRecordMap = (sObjectName: string, record: SalesforceRecord) => {
      if (!record.Id) {
        record.Id = 'someId';
      }
      this.updatedRecordMap[sObjectName] = record;
    };

    return Promise.resolve({
      org: {
        getConnection: () => ({
          getUsername: () => 'test@user.com',
          singleRecordQuery: (query: string) => {
            this.queriesMade.push(query);
            return this.matchingUser;
          },
          tooling: {
            create: setUpdatedRecordMap,
            query: (query: string) => {
              this.queriesMade.push(query);
              let matchingRecord = {} as object | undefined;
              if (query.indexOf('FROM DebugLevel') > -1) {
                matchingRecord = this.matchingDebugLevel;
              } else if (query.indexOf('FROM TraceFlag') > -1) {
                matchingRecord = this.matchingTraceFlag;
              }
              return { totalSize: matchingRecord ? 1 : 0, records: matchingRecord ? [matchingRecord] : null };
            },
            update: setUpdatedRecordMap
          }
        })
      } as unknown as Org,
      debugLevelName: this.debugLevelName ?? DEFAULT_DEBUG_LEVEL_NAME,
      isAutoprocTrace: this.isAutoprocTrace,
      traceDuration: this.traceDuration,
      targetUser: this.username
    });
  }
}

describe('trace plugin', () => {
  let depMapper: FakeDependencyMapper;
  beforeEach(() => {
    depMapper = new FakeDependencyMapper();
    Trace.dependencyMapper = depMapper;
  });

  it('passes the right flags', async () => {
    await Trace.run();

    const debugLevel: OptionFlag<string, CustomOptions> = depMapper.passedFlags['debug-level-name'];
    expect(debugLevel.required).to.be.false;
    expect(debugLevel.char).to.eq('l');
    expect(debugLevel.default).to.eq('SFDC_DevConsole');

    const isAutoprocTrace: BooleanFlag<CustomOptions> = depMapper.passedFlags['is-autoproc-trace'];
    expect(isAutoprocTrace.required).to.be.false;
    expect(isAutoprocTrace.char).to.eq('a');
    const autoprocRelationship = (isAutoprocTrace.relationships ?? [{}])[0] as Relationship;
    expect(autoprocRelationship.flags[0]).to.eql('target-user');
    expect(autoprocRelationship.type).to.eql('none');

    const traceDuration: OptionFlag<string, CustomOptions> = depMapper.passedFlags['trace-duration'];
    expect(traceDuration.required).to.be.false;
    expect(traceDuration.char).to.eq('d');
    expect(traceDuration.default).to.eq('1hr');

    const targetOrg: OptionFlag<Org, CustomOptions> = depMapper.passedFlags['target-org'];
    expect(targetOrg.required).to.be.false;
    expect(targetOrg.char).to.eq('o');

    const targetUser: OptionFlag<string, CustomOptions> = depMapper.passedFlags['target-user'];
    expect(targetUser.char).to.eq('u');
    expect(targetUser.required).to.false;
    const targetUserRelationship = (targetUser.relationships ?? [{}])[0] as Relationship;
    expect(targetUserRelationship.flags[0]).to.eql('is-autoproc-trace');
    expect(targetUserRelationship.type).to.eql('none');
  });

  it('updates an existing trace flag for the current user with default duration', async () => {
    const nowish = Date.now();

    await Trace.run();

    expect(depMapper.queriesMade.length).to.eq(3);
    expect(depMapper.queriesMade[0]).to.eq(`SELECT Id FROM User WHERE Username = 'test@user.com'`);
    expect(depMapper.queriesMade[1]).to.eq(
      `SELECT Id, DeveloperName FROM DebugLevel WHERE DeveloperName = '${depMapper.matchingDebugLevel?.DeveloperName}'`
    );
    expect(depMapper.queriesMade[2]).to.eq(
      `SELECT Id, DebugLevelId
          FROM TraceFlag
          WHERE LogType = 'USER_DEBUG'
          AND TracedEntityId = '${depMapper.matchingUser?.Id}'
          ORDER BY CreatedDate DESC
          LIMIT 1
        `
    );
    const updatedTraceFlag = depMapper.updatedRecordMap.TraceFlag as TraceFlag;
    expect(updatedTraceFlag.StartDate).to.be.lessThan(updatedTraceFlag.ExpirationDate);
    const nowishDate = new Date(nowish);
    const expirationate = new Date(updatedTraceFlag.ExpirationDate);
    expirationate.setSeconds(0);
    expirationate.setMilliseconds(0);
    nowishDate.setSeconds(0);
    nowishDate.setMilliseconds(0);
    expect(expirationate.getTime()).to.eq(nowishDate.getTime() + 1000 * 60 * 60);
  });

  it('updates an existing trace flag for the current user with minute duration', async () => {
    depMapper.traceDuration = '15m';
    const nowish = Date.now();

    await Trace.run();

    const updatedTraceFlag = depMapper.updatedRecordMap.TraceFlag as TraceFlag;
    const expirationate = new Date(updatedTraceFlag.ExpirationDate);
    expirationate.setSeconds(0);
    expirationate.setMilliseconds(0);
    const nowishDate = new Date(nowish);
    nowishDate.setSeconds(0);
    nowishDate.setMilliseconds(0);
    expect(expirationate.getTime()).to.eq(nowishDate.getTime() + 1000 * 15 * 60);
  });

  it('sets a max of 24 hours tracing time when more than that is passed in as the trace duration', async () => {
    depMapper.traceDuration = '50hr';
    const nowish = Date.now();

    await Trace.run();

    const updatedTraceFlag = depMapper.updatedRecordMap.TraceFlag as TraceFlag;
    const expirationate = new Date(updatedTraceFlag.ExpirationDate);
    expirationate.setSeconds(0);
    expirationate.setMilliseconds(0);
    const nowishDate = new Date(nowish);
    nowishDate.setSeconds(0);
    nowishDate.setMilliseconds(0);
    expect(expirationate.getTime()).to.eq(nowishDate.getTime() + 1000 * 60 * 60 * 24);
  });

  it('throws an error for invalid durations', async () => {
    depMapper.traceDuration = '50';
    let err: Error;

    try {
      await Trace.run();
      err = new Error('Fail');
    } catch (error: unknown) {
      err = error as Error;
    }

    expect(err.message).to.eq('Invalid duration "50" supplied');
  });

  it('allows another user to be set instead of the current running user', async () => {
    depMapper.username = 'someotheruser@test.com';

    await Trace.run();

    expect(depMapper.queriesMade[0]).to.eq(`SELECT Id FROM User WHERE Username = '${depMapper.username}'`);
  });

  it('correctly queries the autoproc user when boolean flag is supplied', async () => {
    depMapper.isAutoprocTrace = true;

    await Trace.run();

    expect(depMapper.queriesMade[0]).to.eq(`SELECT Id FROM User WHERE Alias = 'autoproc'`);
  });

  it('creates new TraceFlag when an existing one is not available', async () => {
    depMapper.matchingTraceFlag = undefined;

    await Trace.run();

    const updatedTraceFlag = depMapper.updatedRecordMap.TraceFlag as TraceFlag;
    expect(updatedTraceFlag?.DebugLevelId).to.eq(depMapper.matchingDebugLevel?.Id);
  });

  it('throws an error for invalid user', async () => {
    depMapper.matchingUser = undefined;
    let err: Error;

    try {
      await Trace.run();
      err = new Error('Fail');
    } catch (error: unknown) {
      err = error as Error;
    }

    expect(err.message).to.eq(`User not found: test@user.com`);
  });

  it('creates debug level when no matching results', async () => {
    depMapper.matchingDebugLevel = undefined;

    await Trace.run();

    const createdDebugLevel = depMapper.updatedRecordMap.DebugLevel as SalesforceRecord & {
      ApexCode: string;
      DeveloperName: string;
      MasterLabel: string;
    };
    expect(createdDebugLevel.ApexCode).to.eq('FINE');
    expect(createdDebugLevel.DeveloperName).to.eq(DEFAULT_DEBUG_LEVEL_NAME);
    expect(createdDebugLevel.MasterLabel).to.eq(`Created by sf-trace-plugin`);
  });

  it('updates the existing debug level for an active trace', async () => {
    depMapper.debugLevelName = 'Some Other Debug Level';
    depMapper.matchingDebugLevel = { Id: '7dl000000000', DeveloperName: depMapper.debugLevelName };

    await Trace.run();

    const updatedTraceFlag = depMapper.updatedRecordMap.TraceFlag as TraceFlag;
    expect(updatedTraceFlag.DebugLevelId).to.eq(depMapper.matchingDebugLevel.Id);
  });

  it('uses the same debug level for a trace when not specified', async () => {
    expect(depMapper.debugLevelName).to.be.undefined;
    depMapper.matchingTraceFlag = { DebugLevelId: '7dl0000000', Id: 'someId' };

    await Trace.run();

    const updatedTraceFlag = depMapper.updatedRecordMap.TraceFlag as TraceFlag;
    expect(updatedTraceFlag.DebugLevelId).to.eq(depMapper.matchingTraceFlag.DebugLevelId);
  });
});
