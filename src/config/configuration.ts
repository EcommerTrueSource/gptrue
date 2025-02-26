export default () => ({
  app: {
    port: parseInt(process.env.PORT, 10) || 3000,
    environment: process.env.NODE_ENV || 'development',
    logging: {
      level: process.env.LOG_LEVEL || 'info',
    },
  },
});
