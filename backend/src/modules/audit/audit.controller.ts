import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuditService, AuditAction } from './audit.service';
import { JwtAuthGuard } from '../admin/guards/jwt-auth.guard';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener logs de auditoría con filtros' })
  @ApiQuery({ name: 'action', required: false, enum: AuditAction })
  @ApiQuery({ name: 'entity', required: false })
  @ApiQuery({ name: 'adminId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getAll(
    @Query('action') action?: AuditAction,
    @Query('entity') entity?: string,
    @Query('adminId') adminId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.auditService.getAll({
      action,
      entity,
      adminId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('recent')
  @ApiOperation({ summary: 'Obtener logs recientes' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRecent(@Query('limit') limit?: string) {
    return this.auditService.getRecent(limit ? parseInt(limit, 10) : undefined);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas de auditoría' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getStats(@Query('days') days?: string) {
    return this.auditService.getStats(days ? parseInt(days, 10) : undefined);
  }

  @Get('entity')
  @ApiOperation({ summary: 'Obtener logs por entidad' })
  @ApiQuery({ name: 'entity', required: true })
  @ApiQuery({ name: 'entityId', required: true })
  async getByEntity(@Query('entity') entity: string, @Query('entityId') entityId: string) {
    return this.auditService.getByEntity(entity, entityId);
  }
}
