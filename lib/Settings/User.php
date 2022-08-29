<?php
/**
 * @copyright Copyright (c) 2017 Robin Appelman <robin@icewind.nl>
 *
 * @license GNU AGPL version 3 or any later version
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

namespace OCA\GroupFolders\Settings;

use OCP\IUserSession;
use OCP\IGroupManager;
use OCP\Settings\ISettings;
use OCP\AppFramework\Http\TemplateResponse;
use OCA\GroupFolders\Service\DelegationService;

class User implements ISettings {

	/** @var DelegationService */
	private $delegationService;

	/** @var IGroupManager */
	private $groupManager;

	/** @var IUser */
	private $user;

	public function __construct(
		DelegationService $delegationService,
		IGroupManager $groupManager,
		IUserSession $userSession) {
		$this->delegationService = $delegationService;
		$this->groupManager = $groupManager;
		$this->user = $userSession->getUser();
	}

	/**
	 * @return TemplateResponse
	 */
	public function getForm() {
		return new TemplateResponse(
			'groupfolders',
			'index',
			['appId' => 'groupfolders'],
			''
		);
	}

	/**
	 * @return string|null the section ID, e.g. 'sharing'
	 */
	public function getSection() {
		// Don't show in personal settings when user is not present in the delegated-admins config member.
		// Don't show for the user admin.
		if ($this->delegationService->isAdmin() &&
			!$this->groupManager->isAdmin($this->user->getUID())) {
			return 'groupfolders';
		}
	}

	/**
	 * @return int whether the form should be rather on the top or bottom of
	 * the admin section. The forms are arranged in ascending order of the
	 * priority values. It is required to return a value between 0 and 100.
	 *
	 * E.g.: 70
	 */
	public function getPriority() {
		return 90;
	}
}
