import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, BackHandler } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearPanierData } from '../redux/cartSlice';
import axios from 'axios';
import { API_URL } from '../config/api';

const COLORS = {
  primary: '#FF6B35',
  background: '#F8F9FA',
};

const MAX_STATUS_CHECK_ATTEMPTS = 12;
const TEST_MODE = true; // Passer à false pour utiliser les montants réels et l'environnement de production
const TEST_AMOUNT = 100;

const PaymentWebViewScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const { amount, transactionId } = route.params || {};
  const effectiveAmount = TEST_MODE ? TEST_AMOUNT : Number(amount || 0);

  const [loading, setLoading] = useState(true);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const hasHandledFinalStatus = useRef(false);
  const hasPaymentStarted = useRef(false);
  const statusCheckAttemptsRef = useRef(0);
  const hasShownPendingLimitAlertRef = useRef(false);
  const backendSyncKeysRef = useRef(new Set());

  const IPAY_CONFIG = {
    environment: 'live',
    publicKey: 'pk_f83a240bd0df4393b35a819925863e16',
    redirectUrl: 'https://www.ihambaobab.com/commandesReference',
    cancelUrl: 'https://www.ihambaobab.com/error',
    callbackUrl: 'https://ihambackend.onrender.com/payment_callback2',
  };

  const normalizeText = (value = '') => String(value || '').toLowerCase().trim();

  const normalizePaymentStatus = (status) => {
    const value = normalizeText(status);

    if (['payé', 'paye', 'paid', 'success', 'succeeded', 'completed', 'payé à la livraison', 'payé par téléphone'].includes(value)) {
      return 'succeeded';
    }

    if (['échec', 'echec', 'failed', 'cancelled', 'canceled', 'rejected'].includes(value)) {
      return 'failed';
    }

    return 'pending';
  };

  const extractPaymentOther = (payload) => {
    if (!payload || typeof payload !== 'object') return null;
    if (payload.other) return payload.other;
    if (payload.data?.other) return payload.data.other;
    return null;
  };

  const clearCheckoutLocalState = async () => {
    await AsyncStorage.multiRemove([
      'panier',
      'pendingOrder',
      'paymentInitiated',
      'shippingDetails',
      'idCodePro',
      'appliedPromoCode',
    ]);
  };

  const syncPaymentCallbackToBackend = async ({ status, details = {} } = {}) => {
    const normalizedStatus = normalizePaymentStatus(status);
    if (normalizedStatus !== 'succeeded' && normalizedStatus !== 'failed') {
      return;
    }

    const externalReference = details.externalReference || details.transactionId || transactionId;
    const syncKey = `${externalReference}::${normalizedStatus}`;

    if (backendSyncKeysRef.current.has(syncKey)) {
      return;
    }

    backendSyncKeysRef.current.add(syncKey);

    try {
      await axios.post(`${API_URL}/payment_callback2`, {
        status: normalizedStatus,
        externalReference,
        reference: details.reference,
        publicReference: details.publicReference,
        customerName: details.customerName,
        msisdn: details.msisdn,
        amount: details.amount != null ? Number(details.amount) : effectiveAmount,
        paymentDate: details.paymentDate || new Date().toISOString(),
        failureReason: details.failureReason || null,
        paymentMethod: details.paymentMethod || null,
      });
    } catch (error) {
      backendSyncKeysRef.current.delete(syncKey);
    }
  };

  const handleSuccessNavigation = async () => {
    hasHandledFinalStatus.current = true;

    await dispatch(clearPanierData());
    await clearCheckoutLocalState();

    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
    setTimeout(() => navigation.navigate('Orders'), 100);
  };

  const handleFailureNavigation = async (message = 'Le paiement a échoué. Veuillez réessayer.') => {
    hasHandledFinalStatus.current = true;

    await AsyncStorage.removeItem('paymentInitiated');

    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
    setTimeout(() => navigation.navigate('Orders'), 100);
  };

  const checkPaymentStatus = async ({ silent = false } = {}) => {
    if (hasHandledFinalStatus.current || !hasPaymentStarted.current) {
      return null;
    }

    if (statusCheckAttemptsRef.current >= MAX_STATUS_CHECK_ATTEMPTS) {
      hasShownPendingLimitAlertRef.current = true;
      return null;
    }

    try {
      statusCheckAttemptsRef.current += 1;
      if (!silent) {
        setPaymentProcessing(true);
      }

      const statusResponse = await axios.get(`${API_URL}/getOrderPaymentStatus/${transactionId}`);
      const normalizedStatus = normalizePaymentStatus(statusResponse?.data?.status);

      if (normalizedStatus === 'succeeded') {
        await handleSuccessNavigation();
        return true;
      }

      if (normalizedStatus === 'failed') {
        await handleFailureNavigation();
        return false;
      }

      return null;
    } catch (error) {
      if (error?.response?.status === 404) {
        return null;
      }
      return null;
    } finally {
      if (!silent) {
        setPaymentProcessing(false);
      }
    }
  };

  const syncPaymentFromRedirect = async (redirectUrl) => {
    try {
      const parsed = new URL(redirectUrl);
      const statusParam = normalizeText(parsed.searchParams.get('status') || '');
      const txParam = parsed.searchParams.get('transactionId') || parsed.searchParams.get('externalReference');
      const amountParam = parsed.searchParams.get('amount');

      const isSuccess = ['succeeded', 'success', 'paid'].includes(statusParam);
      const isFailure = ['failed', 'error', 'cancelled', 'canceled'].includes(statusParam);

      if (!isSuccess && !isFailure) {
        return;
      }

      await syncPaymentCallbackToBackend({
        status: isSuccess ? 'succeeded' : 'failed',
        details: {
          externalReference: txParam || transactionId,
          amount: amountParam ? Number(amountParam) : effectiveAmount,
          paymentDate: new Date().toISOString(),
        },
      });

      await checkPaymentStatus({ silent: false });
    } catch (error) {
      // Ignore redirect parsing errors and keep polling fallback.
    }
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert('Annuler le paiement ?', 'Voulez-vous vraiment annuler ce paiement ?', [
        { text: 'Non', style: 'cancel' },
        { text: 'Oui', onPress: () => navigation.goBack() },
      ]);
      return true;
    });

    return () => {
      backHandler.remove();
    };
  }, []);

  const paymentHTML = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Paiement IHAM Baobab</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%);
          color: #333;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          padding: 20px;
        }

        .payment-container {
          background: rgba(255, 255, 255, 0.95);
          padding: 2.5rem;
          border-radius: 15px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 450px;
          text-align: center;
        }

        h1 {
          font-size: 1.8rem;
          color: #333;
          margin-bottom: 1rem;
        }

        p {
          color: #666;
          margin-bottom: 2rem;
          font-size: 1.1rem;
        }

        .ipaymoney-button {
          background-color: #4CAF50;
          color: white;
          border: none;
          padding: 1rem 2rem;
          font-size: 1.1rem;
          border-radius: 8px;
          cursor: pointer;
          width: 100%;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .ipaymoney-button:hover {
          background-color: #45a049;
        }

        .loading {
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
      </style>
    </head>
    <body>
      <div class="payment-container">
        <h1>Finaliser votre paiement</h1>
        <p>Cliquez sur le bouton ci-dessous pour procéder au paiement en toute sécurité</p>
        <button
          type="button"
          id="checkout-button"
          class="ipaymoney-button"
          data-environement="${IPAY_CONFIG.environment}"
          data-key="${IPAY_CONFIG.publicKey}"
          data-amount="${effectiveAmount}"
          data-transaction-id="${transactionId}"
          data-redirect-url="${IPAY_CONFIG.redirectUrl}"
          data-cancel-url="${IPAY_CONFIG.cancelUrl}"
          data-callback-url="${IPAY_CONFIG.callbackUrl}"
        >
          Procéder au paiement
        </button>
      </div>
      
      <!-- Garder le chargement statique: le SDK initialise ses listeners au chargement de page. -->
      <script src="https://i-pay.money/checkout.js"></script>
      <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>

      <script>
        const callbackSentMap = Object.create(null);
        const backendUrl = '${API_URL}';

        function sendToRN(payload) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify(payload));
          }
        }

        function normalizePaymentStatus(status) {
          const value = String(status || '').trim().toLowerCase();

          if (['payé', 'paye', 'paid', 'success', 'succeeded', 'completed', 'payé à la livraison', 'payé par téléphone'].includes(value)) {
            return 'succeeded';
          }

          if (['échec', 'echec', 'failed', 'cancelled', 'canceled', 'rejected'].includes(value)) {
            return 'failed';
          }

          return 'pending';
        }

        function normalizeEventData(rawData) {
          if (rawData && typeof rawData === 'object') {
            return rawData;
          }

          if (typeof rawData === 'string') {
            try {
              return JSON.parse(rawData);
            } catch (e) {
              // Laisser en string si ce n'est pas du JSON.
              return { type: 'raw_text_message', raw: rawData };
            }
          }

          return { type: 'unknown_message_format', raw: rawData };
        }

        function handleIpayMessage(event) {
          const data = normalizeEventData(event.data);

          if (data && data.type === 'payment.response' && data.other) {
            const status = data.other.status;
            const callbackKey = [
              data.other.externalReference || '',
              data.other.reference || '',
              status || ''
            ].join('::');

            if ('${IPAY_CONFIG.callbackUrl}' && !callbackSentMap[callbackKey]) {
              callbackSentMap[callbackKey] = true;
              fetch('${IPAY_CONFIG.callbackUrl}', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(data.other),
              }).catch(function() {});
            }

            sendToRN({
              type: 'payment.response',
              data: data,
            });
            return;
          }

          sendToRN(data);
        }

        function startOrderStatusMonitoring() {
          let resolved = false;
          let wsConnected = false;
          let wsTimedOut = false;
          let pollTimer = null;
          let attempts = 0;
          let totalTime = 0;
          const maxTime = 10 * 60 * 1000;

          const getNextInterval = (currentAttempts) => {
            const intervals = [3000, 5000, 8000, 13000, 21000, 34000, 55000];
            return intervals[Math.min(currentAttempts, intervals.length - 1)];
          };

          const finish = (status, source) => {
            if (resolved) return;
            resolved = true;
            if (pollTimer) clearTimeout(pollTimer);
            sendToRN({ type: 'payment_status_final', status, source });
          };

          const poll = async () => {
            if (resolved) return;
            attempts += 1;

            try {
              const response = await fetch(backendUrl + '/getOrderPaymentStatus/' + encodeURIComponent('${transactionId}'));
              if (response.ok) {
                const data = await response.json();
                const status = normalizePaymentStatus(data?.status);
                if (status === 'succeeded' || status === 'failed') {
                  finish(status, 'polling');
                  return;
                }
              }
            } catch (e) {}

            if (totalTime >= maxTime) return;
            const nextInterval = getNextInterval(attempts - 1);
            pollTimer = setTimeout(() => {
              totalTime += nextInterval;
              poll();
            }, nextInterval);
          };

          const startPollingFallback = () => {
            if (resolved) return;
            poll();
          };

          try {
            const socket = io(backendUrl, {
              transports: ['websocket', 'polling'],
              timeout: 10000,
              reconnection: true,
              reconnectionAttempts: 3,
              reconnectionDelay: 1000,
            });

            socket.on('connect', () => {
              wsConnected = true;
              socket.emit('payment:join', { reference: '${transactionId}' });
            });

            socket.on('payment:status', (event) => {
              if (resolved) return;
              const eventReference = event?.reference || event?.externalReference;
              if (eventReference !== '${transactionId}') return;
              const status = normalizePaymentStatus(event?.statusPayment || event?.status);
              if (status === 'succeeded' || status === 'failed') {
                finish(status, 'websocket');
                socket.emit('payment:leave', { reference: '${transactionId}' });
                socket.disconnect();
              }
            });

            socket.on('disconnect', () => {
              if (!resolved && !wsTimedOut) {
                wsTimedOut = true;
                startPollingFallback();
              }
            });

            setTimeout(() => {
              if (!wsConnected && !resolved) {
                wsTimedOut = true;
                socket.close();
                startPollingFallback();
              }
            }, 10000);
          } catch (e) {
            startPollingFallback();
          }
        }

        window.addEventListener('message', handleIpayMessage);
        window.addEventListener('message', handleIpayMessage, true);
        window.onmessage = handleIpayMessage;
        document.addEventListener('message', handleIpayMessage);

        window.addEventListener('hashchange', function() {
          const hash = window.location.hash;

          if (hash.includes('success') || hash.includes('paid')) {
            sendToRN({
              event: 'ipay_success',
              type: 'payment_success',
              hash: hash
            });
          } else if (hash.includes('cancel') || hash.includes('error')) {
            sendToRN({
              event: 'ipay_cancel',
              type: 'payment_cancel',
              hash: hash
            });
          }
        });

        document.addEventListener("DOMContentLoaded", function() {
          const button = document.getElementById("checkout-button");
          if (!button) {
            sendToRN({ type: 'web_error', message: 'Bouton checkout introuvable' });
            return;
          }

          button.addEventListener('click', function() {
            this.classList.add('loading');
            sendToRN({ type: 'checkout_clicked' });
          });

          setTimeout(function() {
            button.click();
          }, 500);

          startOrderStatusMonitoring();
        });
      </script>
    </body>
    </html>
  `;

  // Gérer les messages du WebView
  const handleWebViewMessage = (event) => {
    try {
      const raw = event.nativeEvent.data;
      let data = raw;

      if (typeof raw === 'string') {
        try {
          data = JSON.parse(raw);
        } catch (parseError) {
          data = {
            type: 'rn_raw_message',
            raw,
            parseError: parseError?.message,
          };
        }
      }

      if (data.type === 'checkout_clicked') {
        hasPaymentStarted.current = true;
        return;
      }

      if (data.type === 'web_error') {
        Alert.alert('Erreur paiement', data.message || 'Erreur interne page de paiement');
        return;
      }

      const paymentResponseData = extractPaymentOther(data);
      if (paymentResponseData) {
        syncPaymentCallbackToBackend({
          status: paymentResponseData.status,
          details: paymentResponseData,
        });
      }

      if (data.type === 'payment_status_final') {
        hasPaymentStarted.current = true;
        if (data.status === 'succeeded') {
          handleSuccessNavigation();
        } else if (data.status === 'failed') {
          handleFailureNavigation();
        }
        return;
      }

      // iPay Money envoie des événements
      if (
        data.event === 'ipay_success' ||
        data.type === 'payment_success' ||
        (data.type === 'payment.response' && data.data?.other?.status === 'succeeded') ||
        (data.type === 'payment.response' && data.other?.status === 'succeeded')
      ) {
        hasPaymentStarted.current = true;

        syncPaymentCallbackToBackend({
          status: 'succeeded',
          details: paymentResponseData || {},
        });

        checkPaymentStatus({ silent: false });
      } else if (
        data.event === 'ipay_cancel' ||
        data.type === 'payment_cancel' ||
        (data.type === 'payment.response' && data.data?.other?.status === 'canceled') ||
        (data.type === 'payment.response' && data.other?.status === 'canceled')
      ) {
        if (hasHandledFinalStatus.current) return;
        syncPaymentCallbackToBackend({
          status: 'failed',
          details: paymentResponseData || {},
        });
        handleFailureNavigation('Vous avez annulé le paiement.');
      } else if (
        data.event === 'ipay_error' ||
        data.type === 'payment_error' ||
        (data.type === 'payment.response' && data.data?.other?.status === 'failed') ||
        (data.type === 'payment.response' && data.other?.status === 'failed')
      ) {
        if (hasHandledFinalStatus.current) return;

        syncPaymentCallbackToBackend({
          status: 'failed',
          details: paymentResponseData || {},
        });
        handleFailureNavigation('Le paiement n\'a pas abouti. Veuillez réessayer.');
      }
    } catch (error) {
      // Ignore malformed transient messages.
    }
  };

  // Gérer la navigation dans le WebView
  const handleNavigationStateChange = (navState) => {
    const { url } = navState;
    const normalizedUrl = normalizeText(url);
    const isIhamDomainRedirect = normalizedUrl.includes('ihambaobab.com');
    const hasSuccessHint =
      normalizedUrl.includes('commandesreference') ||
      normalizedUrl.includes('payment-success') ||
      normalizedUrl.includes('status=succeeded') ||
      normalizedUrl.includes('status=success') ||
      normalizedUrl.includes('status=paid');
    const hasFailureHint =
      normalizedUrl.includes('/error') ||
      normalizedUrl.includes('payment-cancel') ||
      normalizedUrl.includes('status=failed') ||
      normalizedUrl.includes('status=error') ||
      normalizedUrl.includes('status=cancelled') ||
      normalizedUrl.includes('status=canceled');

    if (isIhamDomainRedirect && hasSuccessHint) {
      hasPaymentStarted.current = true;
      syncPaymentFromRedirect(url);
      return false; // Empêcher la navigation
    } else if (isIhamDomainRedirect && hasFailureHint) {
      hasPaymentStarted.current = true;
      syncPaymentFromRedirect(url);
      return false;
    }

    return true;
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: paymentHTML, baseUrl: 'https://www.ihambaobab.com/' }}
        onMessage={handleWebViewMessage}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onShouldStartLoadWithRequest={() => true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        mixedContentMode="always"
        originWhitelist={["*"]}
        javaScriptCanOpenWindowsAutomatically={true}
        style={styles.webview}
      />

      {(loading || paymentProcessing) && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          {paymentProcessing && (
            <Text style={styles.loadingText}>
              Vérification du paiement...
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default PaymentWebViewScreen;
