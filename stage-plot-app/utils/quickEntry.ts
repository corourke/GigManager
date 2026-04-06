export const ALIASES: Record<string, string> = {
  'DI': 'DI Box',
  'SB': 'Stagebox',
  'Amp': 'Amplifier',
  'SP': 'Speaker',
  'Inst': 'Instrument',
  'WR': 'Wireless Receiver',
  'WT': 'Wireless Transmitter',
  'M': 'Microphone',
  'Mic': 'Microphone',
  'Keys': 'Instrument',
  'Other': 'Other',
};

export const parseQuickEntry = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Extract model first to simplify remaining text
  let model: string | undefined = undefined;
  const modelMatch = trimmed.match(/\(([^)]+)\)/);
  let textWithoutModel = trimmed;
  if (modelMatch) {
    model = modelMatch[1];
    textWithoutModel = trimmed.replace(modelMatch[0], '').trim();
  }

  // 1. Try Structured Syntax (Type:Name/Channel) on what remains
  // We check for : or / specifically to trigger structured mode
  if (textWithoutModel.includes(':') || textWithoutModel.includes('/')) {
    const structuredRegex = /^(([^:/]+):)?\s*([^:/]+)(\/([^:]+))?$/;
    const structuredMatch = textWithoutModel.match(structuredRegex);
    
    if (structuredMatch) {
      let type = structuredMatch[2]?.trim();
      let name = structuredMatch[3]?.trim();
      let channelName = structuredMatch[5]?.trim();
      
      if (type && ALIASES[type]) {
        type = ALIASES[type];
      } else if (!type) {
        type = 'Other';
      }
      
      return { type, name, channelName, model };
    }
  }

  // 2. Try Space-separated Syntax (Type Name Channel)
  const parts = textWithoutModel.split(/\s+/).filter(p => !!p);
  if (parts.length === 0) {
    // If we only have a model, we need a name
    if (model) return { type: 'Other', name: 'Unnamed', channelName: undefined, model };
    return null;
  }

  let type = 'Other';
  let name = '';
  let channelName: string | undefined = undefined;

  // Check if first part is a known alias/type
  const rawFirstPart = parts[0];
  const firstPartWithoutColon = rawFirstPart.replace(':', '');
  
  // ALIASES check
  let typeAlias = ALIASES[rawFirstPart] || ALIASES[firstPartWithoutColon];
  
  // Only treat as type if there are enough parts remaining for a name
  const isGenericType = ['M', 'Mic', 'DI', 'SB', 'Amp', 'SP', 'WR', 'WT'].includes(firstPartWithoutColon);

  if (typeAlias && isGenericType && parts.length > 1) {
    type = typeAlias;
    name = parts[1];
    channelName = parts.slice(2).join(' ') || undefined;
  } else {
    // No type prefix or it's an instrument-like name
    name = parts[0];
    channelName = parts.slice(1).join(' ') || undefined;
  }

  if (!name) return null;

  return { type, name, channelName, model };
};
