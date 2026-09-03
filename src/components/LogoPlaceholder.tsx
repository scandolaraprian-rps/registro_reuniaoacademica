import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

/**
 * =======================================================================
 * LOGOTIPO / IMAGEM INSTITUCIONAL
 * =======================================================================
 * Para substituir a imagem do logotipo:
 * 1. Coloque seu arquivo de imagem na pasta /public (ex: /public/meu-logo.png)
 * 2. Atualize a constante DEFAULT_LOGO_SRC abaixo com o caminho do arquivo:
 *    Exemplo: export const DEFAULT_LOGO_SRC = '/meu-logo.png';
 * =======================================================================
 */
export const DEFAULT_LOGO_SRC = '/logo-placeholder.jpg';

interface LogoPlaceholderProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  altText?: string;
}

export const LogoPlaceholder: React.FC<LogoPlaceholderProps> = ({
  className = '',
  size = 'md',
  altText = 'Logotipo da Ata de Reunião Acadêmica'
}) => {
  const [hasError, setHasError] = useState<boolean>(false);

  // Dimensões do container
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 sm:w-11 sm:h-11 rounded-xl',
    lg: 'w-14 h-14 rounded-2xl'
  }[size];

  return (
    <div
      className={`${sizeClasses} overflow-hidden bg-[#FAF9F6] border border-[#DED8CD] shadow-xs shrink-0 flex items-center justify-center select-none ${className}`}
    >
      {!hasError ? (
        <img
          src={DEFAULT_LOGO_SRC}
          alt={altText}
          onError={() => setHasError(true)}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center"
        />
      ) : (
        <div className="w-full h-full bg-[#F2EDE4] flex items-center justify-center text-[#8C8579]">
          <ImageIcon className="w-5 h-5 text-[#4A6741]" />
        </div>
      )}
    </div>
  );
};
