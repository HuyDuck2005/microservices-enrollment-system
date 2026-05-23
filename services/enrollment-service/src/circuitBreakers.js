import grpc from '@grpc/grpc-js';

export function createCircuitBreakerClient(client, options = {}) {
  const {
    timeoutMs = 5000,
    failureThreshold = 5,
    resetTimeoutMs = 15000
  } = options;

  const state = new Map();

  const getState = (method) => {
    if (!state.has(method)) {
      state.set(method, {
        failureCount: 0,
        openUntil: 0
      });
    }
    return state.get(method);
  };

  const callMethod = (methodName, request) => {
    const methodState = getState(methodName);

    if (Date.now() < methodState.openUntil) {
      return Promise.reject(new Error(`${methodName} circuit breaker is open`));
    }

    return new Promise((resolve, reject) => {
      const deadline = Date.now() + timeoutMs;
      client[methodName](request, { deadline }, (error, response) => {
        if (error) {
          methodState.failureCount += 1;
          if (methodState.failureCount >= failureThreshold) {
            methodState.openUntil = Date.now() + resetTimeoutMs;
          }
          reject(error);
          return;
        }

        methodState.failureCount = 0;
        resolve(response);
      });
    });
  };

  return new Proxy({}, {
    get(_, methodName) {
      return (request) => callMethod(methodName, request);
    }
  });
}
