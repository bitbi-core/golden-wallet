export const ETH_NODE_URL = 'https://eth-sepolia.g.alchemy.com/v2/oK3Qi4Qg5Qg4Qg5Qg4Qg5Qg4Qg5Qg5Q';
// export const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';
export const BRIDGE_SERVER_URL = 'https://bridge.bitbi.org/api/1'//'http://localhost:8848'; //'http://bridge.bitbi.org:8848';
export const DEFAULT_WALLET_NAME = 'golden-elephant';

export const ROUTES = {
    APP: {
        HOME: '/',
        WALLET: '/wallet',
        // ... other app routes
    },
    SETUP: {
        PASSWORD: '/setup/password',
        MNEMONIC: '/setup/mnemonic'
    },
    AUTH: {
        LOGIN: '/login',
        RESTORE: '/restore'  // Make sure this is defined
    }
};

export const PUBLIC_ROUTES = [
    ROUTES.SETUP.PASSWORD,
    ROUTES.SETUP.MNEMONIC,
    ROUTES.AUTH.LOGIN,
    ROUTES.AUTH.RESTORE  // Add restore to public routes
];