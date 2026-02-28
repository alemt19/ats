/** @format */

import {
	CanActivate,
	ExecutionContext,
	Inject,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class BetterAuthGuard implements CanActivate {
	constructor(
		@Inject('BETTER_AUTH')
		private readonly betterAuth: { auth: any; handler: any },
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const ctx = context.switchToHttp();
		const req: any = ctx.getRequest();

		const api = this.betterAuth.auth?.api;
		let session = null;
		if (api && typeof api.getSession === 'function') {
			try {
				session = await api.getSession({ headers: req.headers });
			} catch (err) {
				session = null;
			}
		}

		req.userSession = session;
		if (!session) {
			throw new UnauthorizedException('Authentication required');
		}

		return true;
	}
}
