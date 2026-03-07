import { PrismaClient, AgentStatus, TaskStatus, LogLevel } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Clear existing data
  await prisma.tokenUsage.deleteMany();
  await prisma.output.deleteMany();
  await prisma.log.deleteMany();
  await prisma.task.deleteMany();
  await prisma.agent.deleteMany();

  // Create agents
  const rose = await prisma.agent.create({
    data: {
      name: 'Rose',
      role: 'Master/Supervisor - Chief of Staff',
      appId: '131fbca7a0',
      status: AgentStatus.ACTIVE,
    },
  });

  const cathy = await prisma.agent.create({
    data: {
      name: 'Cathy',
      role: 'AI Research Specialist',
      appId: '88a973e2e',
      status: AgentStatus.ACTIVE,
    },
  });

  const ruthie = await prisma.agent.create({
    data: {
      name: 'Ruthie',
      role: 'Medical Research Specialist',
      appId: '7da3fc5a0',
      status: AgentStatus.ACTIVE,
    },
  });

  const sarah = await prisma.agent.create({
    data: {
      name: 'Sarah',
      role: 'Cybersecurity Intelligence Specialist',
      appId: 'ab9a15f4a',
      status: AgentStatus.ACTIVE,
    },
  });

  console.log('Created agents:', rose.name, cathy.name, ruthie.name, sarah.name);

  // Create sample tasks
  const tasks = [
    {
      agentId: rose.id,
      taskName: 'Daily Orchestration',
      description: 'Coordinate daily research tasks between Cathy and Ruthie',
      status: TaskStatus.COMPLETED,
      completedAt: new Date(Date.now() - 86400000),
      output: 'Successfully delegated AI research to Cathy and pregnancy research to Ruthie.',
    },
    {
      agentId: rose.id,
      taskName: 'Weekly Summary',
      description: 'Generate weekly summary of all agent outputs',
      status: TaskStatus.IN_PROGRESS,
    },
    {
      agentId: cathy.id,
      taskName: 'GPT-5 Analysis',
      description: 'Research and analyze latest GPT-5 announcements',
      status: TaskStatus.COMPLETED,
      completedAt: new Date(Date.now() - 172800000),
      output: 'Comprehensive analysis of GPT-5 capabilities and improvements over GPT-4.',
    },
    {
      agentId: cathy.id,
      taskName: 'LLM Comparison',
      description: 'Compare latest open-source LLMs performance',
      status: TaskStatus.COMPLETED,
      completedAt: new Date(Date.now() - 86400000),
      output: 'Benchmarks show Llama 3 outperforming previous models in reasoning tasks.',
    },
    {
      agentId: cathy.id,
      taskName: 'AI Safety News',
      description: 'Research latest developments in AI safety',
      status: TaskStatus.PENDING,
    },
    {
      agentId: ruthie.id,
      taskName: 'IVF Success Rates',
      description: 'Research latest IVF success rate improvements',
      status: TaskStatus.COMPLETED,
      completedAt: new Date(Date.now() - 259200000),
      output: 'New AI-assisted embryo selection showing 15% improvement in success rates.',
    },
    {
      agentId: ruthie.id,
      taskName: 'Epigenetics Update',
      description: 'Latest epigenetics research findings',
      status: TaskStatus.COMPLETED,
      completedAt: new Date(Date.now() - 86400000),
      output: 'Breakthrough in understanding methylation patterns during early development.',
    },
    {
      agentId: ruthie.id,
      taskName: 'CRISPR Breakthroughs',
      description: 'Research CRISPR gene editing advances',
      status: TaskStatus.IN_PROGRESS,
    },
    {
      agentId: sarah.id,
      taskName: 'Daily Cyber Briefing',
      description: 'Comprehensive security vulnerability assessment',
      status: TaskStatus.COMPLETED,
      completedAt: new Date(Date.now() - 86400000),
      output: 'Critical CVE-2026-1234 affecting Microsoft Exchange Server. CVSS 9.8. Active exploitation detected. Patch available.',
    },
    {
      agentId: sarah.id,
      taskName: 'Microsoft Patch Tuesday Analysis',
      description: 'Analyze latest Microsoft security updates',
      status: TaskStatus.COMPLETED,
      completedAt: new Date(Date.now() - 172800000),
      output: '47 vulnerabilities patched including 3 critical RCE flaws. Priority patches identified for enterprise environments.',
    },
    {
      agentId: sarah.id,
      taskName: 'Zero-Day Tracking',
      description: 'Monitor emerging zero-day vulnerabilities',
      status: TaskStatus.PENDING,
    },
  ];

  const createdTasks = [];
  for (const task of tasks) {
    const created = await prisma.task.create({ data: task });
    createdTasks.push(created);
  }

  console.log('Created', createdTasks.length, 'tasks');

  // Create outputs for completed tasks
  const completedTasks = createdTasks.filter(t => t.status === TaskStatus.COMPLETED);
  for (const task of completedTasks) {
    await prisma.output.create({
      data: {
        taskId: task.id,
        agentId: task.agentId,
        content: task.output || 'Task completed successfully.',
        summary: task.output?.substring(0, 100) || 'Task completed.',
      },
    });
  }

  console.log('Created outputs for completed tasks');

  // Create token usage records (simulated historical data)
  const agents = [rose, cathy, ruthie, sarah];
  const now = Date.now();
  
  for (const agent of agents) {
    for (let i = 0; i < 30; i++) {
      const date = new Date(now - i * 86400000);
      const baseTokens = agent.name === 'Rose' ? 500 : agent.name === 'Cathy' ? 1200 : agent.name === 'Sarah' ? 1000 : 800;
      const tokensUsed = Math.floor(baseTokens + Math.random() * 500);
      const cost = tokensUsed * 0.00002; // Simulated cost per token
      
      await prisma.tokenUsage.create({
        data: {
          agentId: agent.id,
          tokensUsed,
          timestamp: date,
          cost,
        },
      });
    }
  }

  console.log('Created token usage records');

  // Create logs
  const logMessages = [
    { agentId: rose.id, level: LogLevel.INFO, message: 'Daily orchestration started' },
    { agentId: rose.id, level: LogLevel.INFO, message: 'Delegated AI research task to Cathy' },
    { agentId: rose.id, level: LogLevel.INFO, message: 'Delegated pregnancy research task to Ruthie' },
    { agentId: cathy.id, level: LogLevel.INFO, message: 'Starting GPT-5 analysis task' },
    { agentId: cathy.id, level: LogLevel.DEBUG, message: 'Fetching latest articles from AI news sources' },
    { agentId: cathy.id, level: LogLevel.INFO, message: 'GPT-5 analysis completed successfully' },
    { agentId: cathy.id, level: LogLevel.WARN, message: 'Rate limit approached on news API' },
    { agentId: ruthie.id, level: LogLevel.INFO, message: 'Starting IVF research task' },
    { agentId: ruthie.id, level: LogLevel.DEBUG, message: 'Querying medical databases' },
    { agentId: ruthie.id, level: LogLevel.INFO, message: 'IVF research completed' },
    { agentId: ruthie.id, level: LogLevel.INFO, message: 'Starting epigenetics research' },
    { agentId: sarah.id, level: LogLevel.INFO, message: 'War Room initialized - starting daily cyber briefing' },
    { agentId: sarah.id, level: LogLevel.DEBUG, message: 'Querying NVD and MITRE databases' },
    { agentId: sarah.id, level: LogLevel.WARN, message: 'High-severity CVE detected - CVSS 9.8' },
    { agentId: sarah.id, level: LogLevel.INFO, message: 'Daily cyber briefing completed' },
    { agentId: rose.id, level: LogLevel.INFO, message: 'Received cyber briefing from Sarah' },
    { agentId: rose.id, level: LogLevel.ERROR, message: 'Failed to reach external API - retrying' },
    { agentId: rose.id, level: LogLevel.INFO, message: 'External API connection restored' },
  ];

  for (let i = 0; i < logMessages.length; i++) {
    const log = logMessages[i];
    await prisma.log.create({
      data: {
        agentId: log.agentId,
        logLevel: log.level,
        message: log.message,
        timestamp: new Date(now - (logMessages.length - i) * 3600000),
        metadata: { source: 'seed' },
      },
    });
  }

  console.log('Created', logMessages.length, 'log entries');
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
