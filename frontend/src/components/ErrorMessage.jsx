import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { AlertCircle, RefreshCw, Wifi } from 'lucide-react';

const ErrorMessage = ({ error, onRetry, title = "Something went wrong" }) => {
  const getErrorIcon = () => {
    if (error?.type === 'network_error') {
      return <Wifi className="w-12 h-12 text-brand-orange mb-4" />;
    }
    return <AlertCircle className="w-12 h-12 text-brand-orange mb-4" />;
  };

  const getErrorMessage = () => {
    if (error?.type === 'network_error') {
      return "Unable to connect to the server. Please check your internet connection and try again.";
    }
    if (error?.message) {
      return error.message;
    }
    return "An unexpected error occurred. Please try again.";
  };

  return (
    <div className="min-h-screen bg-brand-dark text-brand-cyan-bright flex items-center justify-center p-6">
      <Card className="max-w-md w-full bg-brand-navy border-brand-cyan">
        <CardHeader className="text-center">
          <div className="flex justify-center">
            {getErrorIcon()}
          </div>
          <CardTitle className="text-xl font-bold text-brand-cyan-bright">
            {title}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          <p className="text-cyan-300">
            {getErrorMessage()}
          </p>
          
          {onRetry && (
            <Button 
              onClick={onRetry}
              className="bg-brand-cyan hover:bg-cyan-400 text-brand-navy font-semibold"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
          
          {error?.type === 'network_error' && (
            <div className="text-xs text-cyan-400 mt-4">
              <p>• Check your internet connection</p>
              <p>• Make sure the server is running</p>
              <p>• Try refreshing the page</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorMessage;