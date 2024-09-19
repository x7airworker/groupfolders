<?php

declare(strict_types=1);
/**
 * SPDX-FileCopyrightText: 2019 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\GroupFolders\ACL\UserMapping;

use OCP\IUser;

interface IUserMappingManager {
	/**
	 * @param bool $userAssignable whether to include mappings that are assignable by non admin users
	 * @return IUserMapping[]
	 */
	public function getMappingsForUser(IUser $user, bool $userAssignable = true): array;

	public function mappingFromId(string $type, string $id): ?IUserMapping;
}
