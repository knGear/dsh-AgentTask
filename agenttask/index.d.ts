/**
 * dsh-AgentTask host 侧类型声明。
 * 纯 JS 实现,此文件仅为 npm types 字段提供最小声明。
 */
export interface AgentTaskContext {
  webServer: {
    register(opts: {
      kind: string;
      path: string;
      handler: (req: unknown, res: unknown) => void;
    }): void;
  };
  sessions: unknown;
  agents: unknown;
}

export declare function apply(ctx: AgentTaskContext): void;
