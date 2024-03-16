# SF Apex Trace Plugin

This plugin was developed for the Joys Of Apex post [authoring SF plugins](https://jamessimone.net/blog/joys-of-apex/authoring-sf-plugins/), and it allows you to setup and maintain `TraceFlag` records for any Salesforce org you're authorized to using the SF CLI.

## Installation

It can be installed by running:

```bash
echo y | sf plugins install james.simone/sf-trace-plugin
```

Or by adding `james.simone/sf-trace-plugin` to your [unsignedPluginAllowlist.json](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_allowlist.htm):

```json
["james.simone/sf-trace-plugin"]
```

And then running:

```bash
sf plugins install james.simone/sf-trace-plugin
```

Or by pointing to the GitHub repository itself during the install command:

```bash
sf plugins install https://github.com/jamessimone/sf-trace-plugin
```

## Usage

This plugin currently supports the following flags:

- `--debug-level-name` (shortcut `-l`): if there has never been a `USER_DEBUG` TraceFlag record for the given user, this optional flag stipulates the `DebugLevel` DeveloperName to use. Defaults to `SFDC_DevConsole`, otherwise.
- `--is-autoproc-trace` (shortcut `-a`): if the trace should be set for the Automated Process User. Cannot be used in conjunction with `--target-user`
- `--trace-duration` (shortcut `-d`): how long you'd like the trace to be active for. Defaults to `1hr` and values can be supplied with either minutes (eg `15m`) or hours (eg `4hr`). Because `TraceFlag` records can have a max duration of 24 hours, inputting a trace duration of more than that will only set the duration for 24 hours.
- `--target-org` (shortcut `-o`): the name/alias of the org you want to establish the trace on. Defaults to your currently authorized org when run in an SFDX project directory
- `--target-user` (shortcut `-u`): by default, traces are set for the currently authorized user; this flag allows you to override that and supply any valid username in the org to set a trace for. Cannot be used in conjunction with `--is-autoproc-trace`
