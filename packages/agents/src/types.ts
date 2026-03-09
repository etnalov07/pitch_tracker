export type AgentModel = 'sonnet' | 'opus' | 'haiku';

export type AgentName = 'planning' | 'design' | 'coding' | 'qa';

export interface AgentDefinition {
    name: AgentName;
    description: string;
    systemPrompt: string;
    tools: string[];
    model: AgentModel;
    artifactFilename: string | null;
}

export interface AgentResult {
    agentName: AgentName;
    output: string;
    artifactPath: string | null;
    durationMs: number;
    success: boolean;
    error?: string;
}

export interface PipelineConfig {
    featureRequest: string;
    outputDir: string;
    agents: AgentName[];
    projectRoot: string;
}

export interface PipelineResult {
    config: PipelineConfig;
    results: AgentResult[];
    totalDurationMs: number;
}
