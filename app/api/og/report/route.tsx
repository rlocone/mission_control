import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Whitelist of valid agents - prevents injection
const VALID_AGENTS = ['Rose', 'Cathy', 'Ruthie', 'Sarah'] as const;
type ValidAgent = typeof VALID_AGENTS[number];

const agentColors: Record<ValidAgent, { primary: string; secondary: string }> = {
  'Rose': { primary: '#ec4899', secondary: '#f472b6' },
  'Cathy': { primary: '#8b5cf6', secondary: '#a78bfa' },
  'Ruthie': { primary: '#10b981', secondary: '#34d399' },
  'Sarah': { primary: '#ef4444', secondary: '#f97316' },
};

const agentEmojis: Record<ValidAgent, string> = {
  'Rose': '🌹',
  'Cathy': '🔬',
  'Ruthie': '💊',
  'Sarah': '🔐',
};

/**
 * Sanitize and limit string length to prevent injection attacks
 * Only allows alphanumeric, spaces, and basic punctuation
 */
function sanitizeText(input: string | null, maxLength: number = 100): string {
  if (!input) return '';
  // Remove any characters that could be used for injection
  // Allow only: letters, numbers, spaces, and basic punctuation
  return input
    .replace(/[^\p{L}\p{N}\s\-_.,:!?'"/()]/gu, '')
    .slice(0, maxLength)
    .trim();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Validate agent against whitelist - reject unknown agents
  const rawAgent = searchParams.get('agent');
  const agent: ValidAgent = VALID_AGENTS.includes(rawAgent as ValidAgent) 
    ? (rawAgent as ValidAgent) 
    : 'Rose';
  
  // Sanitize task name to prevent any injection
  const rawTask = searchParams.get('task');
  const task = sanitizeText(rawTask, 100) || 'Intelligence Report';
  
  // These are now guaranteed safe from whitelist
  const colors = agentColors[agent];
  const emoji = agentEmojis[agent];

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #252545 100%)',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {/* Background Pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `radial-gradient(circle at 20% 80%, ${colors.primary}20 0%, transparent 50%), radial-gradient(circle at 80% 20%, ${colors.secondary}20 0%, transparent 50%)`,
          }}
        />

        {/* Content Container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px',
            position: 'relative',
          }}
        >
          {/* Mission Control Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '12px 24px',
              borderRadius: '50px',
              marginBottom: '40px',
            }}
          >
            <span style={{ fontSize: '32px' }}>🎯</span>
            <span style={{ fontSize: '20px', color: '#ffffff', fontWeight: 600 }}>
              Mission Control
            </span>
          </div>

          {/* Agent Card */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '30px',
              background: `linear-gradient(135deg, ${colors.primary}40, ${colors.secondary}20)`,
              padding: '40px 60px',
              borderRadius: '24px',
              border: `2px solid ${colors.primary}60`,
            }}
          >
            <div
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '24px',
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '60px',
              }}
            >
              {emoji}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 700,
                  color: '#ffffff',
                  lineHeight: 1.2,
                  maxWidth: '600px',
                }}
              >
                {task}
              </div>
              <div
                style={{
                  fontSize: '24px',
                  color: colors.primary,
                  fontWeight: 600,
                }}
              >
                by {agent}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '40px',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '18px',
            }}
          >
            <span>🌹</span>
            <span>Intelligence Report</span>
            <span style={{ margin: '0 8px' }}>•</span>
            <span>Powered by Abacus AI</span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
