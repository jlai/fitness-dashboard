// Mock for mui-sonner
module.exports = {
  Toaster: () => null,
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
};
