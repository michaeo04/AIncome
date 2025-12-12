// FormattedText - Renders text with markdown formatting (bold, line breaks)

import React from 'react';
import { Text, TextStyle } from 'react-native';

interface FormattedTextProps {
  text: string;
  style?: TextStyle;
  boldStyle?: TextStyle;
}

const FormattedText: React.FC<FormattedTextProps> = ({ text, style, boldStyle }) => {
  // Split text by bold markers (**text**)
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return (
    <Text style={style}>
      {parts.map((part, index) => {
        // Check if this part is bold (wrapped in **)
        if (part.startsWith('**') && part.endsWith('**')) {
          // Remove ** markers and render as bold
          const boldText = part.slice(2, -2);
          return (
            <Text key={index} style={[style, boldStyle, { fontWeight: 'bold' }]}>
              {boldText}
            </Text>
          );
        }
        // Regular text
        return <Text key={index}>{part}</Text>;
      })}
    </Text>
  );
};

export default FormattedText;
