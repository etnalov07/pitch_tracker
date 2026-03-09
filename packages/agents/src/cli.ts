#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import { runPipeline } from './pipeline';
import { AgentName, PipelineConfig } from './types';

const VALID_AGENTS: AgentName[] = ['planning', 'design', 'coding', 'qa'];
const DEFAULT_PIPELINE: AgentName[] = ['planning', 'design', 'coding', 'qa'];

const program = new Command();

program.name('pitch-agents').description('Multi-agent development pipeline for Pitch Tracker').version('1.0.0');

program
    .command('run')
    .description('Run the agent pipeline for a feature request')
    .argument('<feature>', 'Feature request description')
    .option('--only <agents>', 'Comma-separated list of agents to run (planning,design,coding,qa)')
    .option('--output-dir <path>', 'Output directory for artifacts', './output')
    .option('--project-root <path>', 'Project root directory')
    .action(async (feature: string, opts: { only?: string; outputDir: string; projectRoot?: string }) => {
        let agents = DEFAULT_PIPELINE;
        if (opts.only) {
            agents = opts.only.split(',').map((a) => a.trim()) as AgentName[];
            for (const agent of agents) {
                if (!VALID_AGENTS.includes(agent)) {
                    console.error(`Unknown agent: ${agent}. Valid agents: ${VALID_AGENTS.join(', ')}`);
                    process.exit(1);
                }
            }
        }

        const projectRoot = opts.projectRoot || path.resolve(__dirname, '..', '..', '..');
        const outputDir = path.resolve(opts.outputDir);

        console.log('Pitch Tracker Agent Pipeline');
        console.log('===========================');
        console.log(`Feature: ${feature}`);
        console.log(`Agents:  ${agents.join(' -> ')}`);
        console.log(`Output:  ${outputDir}`);
        console.log(`Root:    ${projectRoot}`);

        const config: PipelineConfig = {
            featureRequest: feature,
            outputDir,
            agents,
            projectRoot,
        };

        try {
            const result = await runPipeline(config);

            console.log('\n===========================');
            console.log('Pipeline Complete!');
            console.log(`Total time: ${(result.totalDurationMs / 1000).toFixed(1)}s\n`);

            console.log('Results:');
            for (const r of result.results) {
                const status = r.success ? '>' : 'x';
                const seconds = (r.durationMs / 1000).toFixed(1);
                const artifact = r.artifactPath ? ` -> ${r.artifactPath}` : '';
                console.log(`  ${status} ${r.agentName} (${seconds}s)${artifact}`);
            }

            const failures = result.results.filter((r) => !r.success);
            if (failures.length > 0) {
                console.log(`\n${failures.length} agent(s) failed.`);
                process.exit(1);
            }
        } catch (err) {
            console.error('\nPipeline error:', err instanceof Error ? err.message : err);
            process.exit(1);
        }
    });

program
    .command('list')
    .description('List available agents')
    .action(() => {
        console.log('Available agents:');
        console.log('  planning  - Analyzes features, breaks down tasks, identifies scope');
        console.log('  design    - Creates technical designs, data models, API specs');
        console.log('  coding    - Implements features following project conventions');
        console.log('  qa        - Validates code, runs checks, produces QA reports');
        console.log(`\nDefault pipeline: ${DEFAULT_PIPELINE.join(' -> ')}`);
    });

program.parse();
