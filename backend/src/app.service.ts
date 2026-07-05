import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getRoot(): { message: string } {
    return {
      message: 'Crazy Cookies E-commerce API - Welcome!',
    };
  }

  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
