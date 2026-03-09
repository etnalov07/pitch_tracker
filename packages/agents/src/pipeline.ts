import { query, type SDKMessage, type SDKResultMessage } from '@anthropic-ai/claude-code';
import * as fs from 'fs';
import * as path from 'path';
import { AgentDefinition, AgentResult, PipelineConfig, PipelineResult } from './types';
import { planningAgent } from './agents/planning';
import { designAgent } from './agents/design';
import { codingAgent } from './agents/coding';
import { qaAgent } from './agents/qa';

const ALL_AGENTS: Record<string, AgentDefinition> = {
    planning: planningAgent,
    design: designAgent,
    coding: codingAgent,
    qa: qaAgent,
};

async function runAgent(agent: AgentDefinition, prompt: string, cwd: string, outputDir: string): Promise<AgentResult> {
    const startTime = Date.now();
    let finalResult = '';
    let success = false;
    let error: string | undefined;

    try {
        for await (const message of query({
            prompt,
            options: {
                model: agent.model,
                allowedTools: agent.tools,
                customSystemPrompt: agent.systemPrompt,
                maxTurns: agent.name === 'coding' ? 50 : 30,
                cwd,
            },
        })) {
            if (message.type === 'assistant' && 'message' in message && message.message?.content) {
                for (const block of message.message.content) {
                    if ('text' in block) {
                        process.stdout.write('.');
                    }
                }
            }

            if (message.type === 'result') {
                const resultMsg = message as SDKResultMessage;
                if (resultMsg.subtype === 'success') {
                    finalResult = resultMsg.result;
                    success = true;
                } else {
                    error = `Agent ended with status: ${resultMsg.subtype}`;
                }
            }
        }
    } catch (err) {
        error = err instanceof Error ? err.message : String(err);
    }

    const durationMs = Date.now() - startTime;
    let artifactPath: string | null = null;

    if (agent.artifactFilename && finalResult) {
        artifactPath = path.join(outputDir, agent.artifactFilename);
        fs.writeFileSync(artifactPath, finalResult, 'utf-8');
    }

    return {
        agentName: agent.name,
        output: finalResult,
        artifactPath,
        durationMs,
        success,
        error,
    };
}

export async function runPipeline(config: PipelineConfig): Promise<PipelineResult> {
    const startTime = Date.now();
    const results: AgentResult[] = [];

    if (!fs.existsSync(config.outputDir)) {
        fs.mkdirSync(config.outputDir, { recursive: true });
    }

    const agentsToRun = config.agents.map((name) => {
        const agent = ALL_AGENTS[name];
        if (!agent) {
            throw new Error(`Unknown agent: ${name}. Valid agents: ${Object.keys(ALL_AGENTS).join(', ')}`);
        }
        return agent;
    });

    let priorContext = '';

    for (let i = 0; i < agentsToRun.length; i++) {
        const agent = agentsToRun[i];
        const stepLabel = `[${i + 1}/${agentsToRun.length}]`;

        console.log(`\n${stepLabel} ${agent.name.charAt(0).toUpperCase() + agent.name.slice(1)} Agent...`);

        let prompt = `# Feature Request\n\n${config.featureRequest}`;

        if (priorContext) {
            prompt += `\n\n# Prior Agent Outputs\n\n${priorContext}`;
        }

        prompt += `\n\n# Your Task\n\nYou are the ${agent.name} agent. Complete your role as described in your system prompt. The project root is: ${config.projectRoot}`;

        const result = await runAgent(agent, prompt, config.projectRoot, config.outputDir);
        results.push(result);

        const seconds = (result.durationMs / 1000).toFixed(1);
        if (result.success) {
            const artifactMsg = result.artifactPath ? ` written to ${path.basename(result.artifactPath)}` : ' complete';
            console.log(`\n  > ${agent.name}${artifactMsg} (${seconds}s)`);
        } else {
            console.log(`\n  x ${agent.name} failed: ${result.error} (${seconds}s)`);
        }

        if (result.output) {
            priorContext += `\n## ${agent.name.charAt(0).toUpperCase() + agent.name.slice(1)} Agent Output\n\n${result.output}\n`;
        }
    }

    return {
        config,
        results,
        totalDurationMs: Date.now() - startTime,
    };
}
