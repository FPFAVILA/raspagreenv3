import React, { useState, useEffect, useRef } from 'react';
import { X, Shield, CheckCircle, Copy, QrCode } from 'lucide-react';
import { useFictionalPix } from '../hooks/useFictionalPix';
import { QRCodeGenerator } from './QRCodeGenerator';
import { trackPurchase } from '../utils/tracking';

interface KYCDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerificationComplete: () => void;
}

export const KYCDepositModal: React.FC<KYCDepositModalProps> = ({
  isOpen,
  onClose,
  onVerificationComplete
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pixGenerated, setPixGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const { pixData, createPix, checkPixStatus, reset } = useFictionalPix();
  const paymentCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);

  const DEPOSIT_AMOUNT = 4.90;

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
      isProcessingRef.current = false;
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

          setTimeout(() => {
            trackPurchase(status.value);
            onVerificationComplete();

            setTimeout(() => {
              onClose();
            }, 1500);
          }, 1500);
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
  }, [pixData, isOpen, pixGenerated, checkPixStatus, onVerificationComplete, onClose]);

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

  if (processingPayment) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
        <div className="bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md border border-gray-800 p-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-white font-bold text-2xl mb-2">Verificacao Concluida!</h3>
            <p className="text-gray-400 text-sm">
              Sua conta foi validada com sucesso
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (pixGenerated && pixData) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
        <div className="bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md border border-gray-800 max-h-[90vh] overflow-y-auto">
          <div className="bg-accent p-4 rounded-t-3xl sticky top-0 z-10">
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

          <div className="p-6">
            <div className="space-y-4">
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
                  Codigo PIX (Copia e Cola)
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
                        <span>Copiar Codigo</span>
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
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Deposito KYC</h2>
                <p className="text-white/80 text-sm">Verificacao de titularidade</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700 mb-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Deposito de Verificacao</h3>
              <p className="text-gray-400 text-sm mb-4">
                Realize um deposito para confirmar sua titularidade
              </p>

              <div className="bg-accent/20 rounded-xl p-4 border border-accent/50 mb-4">
                <div className="text-accent text-3xl font-bold mb-1">
                  R$ {DEPOSIT_AMOUNT.toFixed(2).replace('.', ',')}
                </div>
                <p className="text-gray-400 text-xs">Valor de verificacao</p>
              </div>

              <button
                onClick={handleGeneratePix}
                disabled={isGenerating}
                className="w-full bg-accent text-white font-bold py-4 rounded-xl hover:bg-accent-hover transition-all duration-300 active:scale-95 shadow-modern disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ touchAction: 'manipulation' }}
              >
                {isGenerating ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Gerando PIX...</span>
                  </div>
                ) : (
                  'Iniciar Verificacao'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
