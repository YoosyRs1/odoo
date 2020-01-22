# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo.tests import tagged
from odoo.addons.mail.tests.common import mail_new_test_user
from odoo.addons.test_mail.tests.common import TestMailCommon
from odoo.exceptions import AccessError, except_orm, ValidationError, UserError
from odoo.tools import mute_logger, formataddr


@tagged('post_install', '-at_install')
class TestChannelAccessRights(TestMailCommon):

    @classmethod
    def setUpClass(cls):
        super(TestChannelAccessRights, cls).setUpClass()
        Channel = cls.env['mail.channel'].with_context(cls._test_context)

        cls.user_public = mail_new_test_user(cls.env, login='bert', groups='base.group_public', name='Bert Tartignole')
        cls.user_portal = mail_new_test_user(cls.env, login='chell', groups='base.group_portal', name='Chell Gladys')

        # Pigs: base group for tests
        cls.group_pigs = Channel.create({
            'name': 'Pigs',
            'public': 'groups',
            'group_public_id': cls.env.ref('base.group_user').id})
        # Jobs: public group
        cls.group_public = Channel.create({
            'name': 'Jobs',
            'description': 'NotFalse',
            'public': 'public'})
        # Private: private group
        cls.group_private = Channel.create({
            'name': 'Private',
            'public': 'private'})

    @mute_logger('odoo.addons.base.models.ir_model', 'odoo.models')
    def test_access_rights_public(self):
        # Read public group -> ok
        self.group_public.with_user(self.user_public).read()

        # Read Pigs -> ko, restricted to employees
        # TODO: Change the except_orm to Warning ( Because here it's call check_access_rule
        # which still generate exception in except_orm.So we need to change all
        # except_orm to warning in mail module.)
        with self.assertRaises(except_orm):
            self.group_pigs.with_user(self.user_public).read()

        # Read a private group when being a member: ok
        self.group_private.write({'channel_partner_ids': [(4, self.user_public.partner_id.id)]})
        self.group_private.with_user(self.user_public).read()

        # Create group: ko, no access rights
        with self.assertRaises(AccessError):
            self.env['mail.channel'].with_user(self.user_public).create({'name': 'Test'})

        # Update group: ko, no access rights
        with self.assertRaises(AccessError):
            self.group_public.with_user(self.user_public).write({'name': 'Broutouschnouk'})

        # Unlink group: ko, no access rights
        with self.assertRaises(AccessError):
            self.group_public.with_user(self.user_public).unlink()

    @mute_logger('odoo.addons.base.models.ir_model', 'odoo.models', 'odoo.models.unlink')
    def test_access_rights_groups(self):
        # Employee read employee-based group: ok
        # TODO Change the except_orm to Warning
        self.group_pigs.with_user(self.user_employee).read()

        # Employee can create a group
        self.env['mail.channel'].with_user(self.user_employee).create({'name': 'Test'})

        # Employee update employee-based group: ok
        self.group_pigs.with_user(self.user_employee).write({'name': 'modified'})

        # Employee unlink employee-based group: ok
        self.group_pigs.with_user(self.user_employee).unlink()

        # Employee cannot read a private group
        with self.assertRaises(except_orm):
            self.group_private.with_user(self.user_employee).read()

        # Employee cannot write on private
        with self.assertRaises(AccessError):
            self.group_private.with_user(self.user_employee).write({'name': 're-modified'})

    @mute_logger('odoo.addons.base.models.ir_model', 'odoo.models')
    def test_access_rights_followers_ko(self):
        # self.group_private.name has been put in the cache during the setup as sudo
        # It must therefore be removed from the cache in other to validate the fact user_portal can't read it.
        self.group_private.invalidate_cache(['name'])
        with self.assertRaises(AccessError):
            self.group_private.with_user(self.user_portal).name

    def test_access_rights_followers_portal(self):
        # Do: Chell is added into Pigs members and browse it -> ok for messages, ko for partners (no read permission)
        self.group_private.write({'channel_partner_ids': [(4, self.user_portal.partner_id.id)]})
        chell_pigs = self.group_private.with_user(self.user_portal)
        trigger_read = chell_pigs.name
        for message in chell_pigs.message_ids:
            trigger_read = message.subject

        with self.assertRaises(AccessError):
            chell_pigs.message_partner_ids

        for partner in self.group_private.message_partner_ids:
            if partner.id == self.user_portal.partner_id.id:
                # Chell can read her own partner record
                continue
            with self.assertRaises(AccessError):
                trigger_read = partner.with_user(self.user_portal).name


@tagged('post_install', '-at_install')
class TestChannelFeatures(TestMailCommon):

    @classmethod
    def setUpClass(cls):
        super(TestChannelFeatures, cls).setUpClass()
        cls.test_channel = cls.env['mail.channel'].with_context(cls._test_context).create({
            'name': 'Test',
            'description': 'Description',
            'alias_name': 'test',
            'public': 'public',
        })
        cls.test_partner = cls.env['res.partner'].with_context(cls._test_context).create({
            'name': 'Test Partner',
            'email': 'test@example.com',
        })

    def _join_channel(self, channel, partners):
        for partner in partners:
            channel.write({'channel_last_seen_partner_ids': [(0, 0, {'partner_id': partner.id})]})
        channel.invalidate_cache()

    def _leave_channel(self, channel, partners):
        for partner in partners:
            channel._action_unfollow(partner)

    def test_channel_listeners(self):
        self.assertEqual(self.test_channel.message_channel_ids, self.test_channel)
        self.assertEqual(self.test_channel.message_partner_ids, self.env['res.partner'])
        self.assertEqual(self.test_channel.channel_partner_ids, self.env['res.partner'])

        self._join_channel(self.test_channel, self.test_partner)
        self.assertEqual(self.test_channel.message_channel_ids, self.test_channel)
        self.assertEqual(self.test_channel.message_partner_ids, self.env['res.partner'])
        self.assertEqual(self.test_channel.channel_partner_ids, self.test_partner)

        self._leave_channel(self.test_channel, self.test_partner)
        self.assertEqual(self.test_channel.message_channel_ids, self.test_channel)
        self.assertEqual(self.test_channel.message_partner_ids, self.env['res.partner'])
        self.assertEqual(self.test_channel.channel_partner_ids, self.env['res.partner'])

    def test_channel_post_nofollow(self):
        self.test_channel.message_post(body='Test', message_type='comment', subtype_xmlid='mail.mt_comment')
        self.assertEqual(self.test_channel.message_channel_ids, self.test_channel)
        self.assertEqual(self.test_channel.message_partner_ids, self.env['res.partner'])

    @mute_logger('odoo.addons.mail.models.mail_mail', 'odoo.models.unlink')
    def test_channel_mailing_list_recipients(self):
        """ Posting a message on a mailing list should send one email to all recipients """
        self.env['ir.config_parameter'].set_param('mail.catchall.domain', 'schlouby.fr')
        self.test_channel.write({'email_send': True})

        # Subscribe an user without email. We shouldn't try to send email to them.
        nomail = self.env['res.users'].create({
            "login": "nomail",
            "name": "No Mail",
            "email": False,
            "notification_type": "email",
        })
        self._join_channel(self.test_channel, self.user_employee.partner_id | self.test_partner | nomail.partner_id)
        with self.mock_mail_gateway():
            self.test_channel.message_post(body="Test", message_type='comment', subtype_xmlid='mail.mt_comment')
        self.assertSentEmail(self.test_channel.env.user.partner_id, [self.partner_employee, self.test_partner])

    @mute_logger('odoo.addons.mail.models.mail_mail', 'odoo.models.unlink')
    def test_channel_chat_recipients(self):
        """ Posting a message on a chat should not send emails """
        self.env['ir.config_parameter'].set_param('mail.catchall.domain', 'schlouby.fr')
        self.test_channel.write({'email_send': False})
        self._join_channel(self.test_channel, self.user_employee.partner_id | self.test_partner)
        with self.mock_mail_gateway():
            self.test_channel.message_post(body="Test", message_type='comment', subtype_xmlid='mail.mt_comment')
        self.assertNotSentEmail()
        self.assertEqual(len(self._mails), 0)

    @mute_logger('odoo.addons.mail.models.mail_mail', 'odoo.models.unlink')
    def test_channel_classic_recipients(self):
        """ Posting a message on a classic channel should work like classic post """
        self.test_channel.write({'alias_name': False})
        self.test_channel.message_subscribe([self.user_employee.partner_id.id, self.test_partner.id])
        with self.mock_mail_gateway():
            self.test_channel.message_post(body="Test", message_type='comment', subtype_xmlid='mail.mt_comment')
        self.assertSentEmail(self.test_channel.env.user.partner_id, [self.test_partner])

    @mute_logger('odoo.addons.mail.models.mail_mail')
    def test_channel_out_of_office(self):
        self.user_employee.out_of_office_message = 'Out'
        test_chat = self.env['mail.channel'].with_context(self._test_context).create({
            'channel_partner_ids': [(4, self.user_employee.partner_id.id), (4, self.user_admin.partner_id.id)],
            'public': 'private',
            'channel_type': 'chat',
            'email_send': False,
            'name': 'test'
        })
        infos = test_chat.with_user(self.user_admin).channel_info()
        self.assertEqual(infos[0]['direct_partner'][0]['out_of_office_message'], 'Out')


@tagged('moderation', 'post_install', '-at_install')
class TestChannelModeration(TestMailCommon):

    @classmethod
    def setUpClass(cls):
        super(TestChannelModeration, cls).setUpClass()

        cls.channel_1 = cls.env['mail.channel'].create({
            'name': 'Moderation_1',
            'email_send': True,
            'moderation': True,
            'channel_partner_ids': [(4, cls.partner_employee.id)],
            'moderator_ids': [(4, cls.user_employee.id)],
        })
        cls.user_portal = cls._create_portal_user()

    def test_moderator_consistency(self):
        # moderators should be channel members
        with self.assertRaises(ValidationError):
            self.channel_1.write({'moderator_ids': [(4, self.user_admin.id)]})

        # member -> moderator or
        self.channel_1.write({'channel_partner_ids': [(4, self.partner_admin.id)]})
        self.channel_1.write({'moderator_ids': [(4, self.user_admin.id)]})

        # member -> moderator ko if no email
        self.channel_1.write({'moderator_ids': [(3, self.partner_admin.id)]})
        self.user_admin.write({'email': False})
        with self.assertRaises(ValidationError):
            self.channel_1.write({'moderator_ids': [(4, self.user_admin.id)]})

    def test_moderation_consistency(self):
        # moderation enabled channels are restricted to mailing lists
        with self.assertRaises(ValidationError):
            self.channel_1.write({'email_send': False})

        # moderation enabled channels should always have moderators
        with self.assertRaises(ValidationError):
            self.channel_1.write({'moderator_ids': [(5, 0)]})

    def test_moderation_count(self):
        self.assertEqual(self.channel_1.moderation_count, 0)
        self.channel_1.write({'moderation_ids': [
            (0, 0, {'email': 'test0@example.com', 'status': 'allow'}),
            (0, 0, {'email': 'test1@example.com', 'status': 'ban'})
        ]})
        self.assertEqual(self.channel_1.moderation_count, 2)

    @mute_logger('odoo.addons.mail.models.mail_channel', 'odoo.models.unlink')
    def test_send_guidelines(self):
        self.channel_1.write({'channel_partner_ids': [(4, self.partner_portal.id), (4, self.partner_admin.id)]})
        self.channel_1._update_moderation_email([self.partner_admin.email], 'ban')
        with self.mock_mail_gateway():
            self.channel_1.with_user(self.user_employee).send_guidelines()
        for mail in self._new_mails:
            self.assertEqual(mail.author_id, self.partner_employee)
            self.assertEqual(mail.subject, 'Guidelines of channel %s' % self.channel_1.name)
            self.assertEqual(mail.state, 'outgoing')
            self.assertEqual(mail.email_from, self.user_employee.company_id.catchall_formatted)
        self.assertEqual(self._new_mails.mapped('recipient_ids'), self.partner_employee | self.partner_portal)

    def test_send_guidelines_crash(self):
        self.channel_1.write({
            'channel_partner_ids': [(4, self.partner_admin.id)],
            'moderator_ids': [(4, self.user_admin.id), (3, self.user_employee.id)]
        })
        with self.assertRaises(UserError):
            self.channel_1.with_user(self.user_employee).send_guidelines()

    def test_update_moderation_email(self):
        self.channel_1.write({'moderation_ids': [
            (0, 0, {'email': 'test0@example.com', 'status': 'allow'}),
            (0, 0, {'email': 'test1@example.com', 'status': 'ban'})
        ]})
        self.channel_1._update_moderation_email(['test0@example.com', 'test3@example.com'], 'ban')
        self.assertEqual(len(self.channel_1.moderation_ids), 3)
        self.assertTrue(all(status == 'ban' for status in self.channel_1.moderation_ids.mapped('status')))

    def test_moderation_reset(self):
        self.channel_2 = self.env['mail.channel'].create({
            'name': 'Moderation_1',
            'email_send': True,
            'moderation': True,
            'channel_partner_ids': [(4, self.partner_employee.id)],
            'moderator_ids': [(4, self.user_employee.id)],
        })

        self.msg_c1_1 = self._add_messages(self.channel_1, 'Body11', author=self.partner_admin, moderation_status='accepted')
        self.msg_c1_2 = self._add_messages(self.channel_1, 'Body12', author=self.partner_admin, moderation_status='pending_moderation')
        self.msg_c2_1 = self._add_messages(self.channel_2, 'Body21', author=self.partner_admin, moderation_status='pending_moderation')

        self.assertEqual(self.env['mail.message'].search_count([
            ('moderation_status', '=', 'pending_moderation'),
            ('model', '=', 'mail.channel'), ('res_id', '=', self.channel_1.id)
        ]), 1)
        self.channel_1.write({'moderation': False})
        self.assertEqual(self.env['mail.message'].search_count([
            ('moderation_status', '=', 'pending_moderation'),
            ('model', '=', 'mail.channel'), ('res_id', '=', self.channel_1.id)
        ]), 0)
        self.assertEqual(self.env['mail.message'].search_count([
            ('moderation_status', '=', 'pending_moderation'),
            ('model', '=', 'mail.channel'), ('res_id', '=', self.channel_2.id)
        ]), 1)
        self.channel_2.write({'moderation': False})
        self.assertEqual(self.env['mail.message'].search_count([
            ('moderation_status', '=', 'pending_moderation'),
            ('model', '=', 'mail.channel'), ('res_id', '=', self.channel_2.id)
        ]), 0)

    @mute_logger('odoo.models.unlink')
    def test_message_post(self):
        email1 = 'test0@example.com'
        email2 = 'test1@example.com'

        self.channel_1._update_moderation_email([email1], 'ban')
        self.channel_1._update_moderation_email([email2], 'allow')

        msg_admin = self.channel_1.message_post(message_type='email', subtype_xmlid='mail.mt_comment', author_id=self.partner_admin.id)
        msg_moderator = self.channel_1.message_post(message_type='comment', subtype_xmlid='mail.mt_comment', author_id=self.partner_employee.id)
        msg_email1 = self.channel_1.message_post(message_type='comment', subtype_xmlid='mail.mt_comment', email_from=formataddr(("MyName", email1)))
        msg_email2 = self.channel_1.message_post(message_type='email', subtype_xmlid='mail.mt_comment', email_from=email2)
        msg_notif = self.channel_1.message_post()

        messages = self.env['mail.message'].search([('model', '=', 'mail.channel'), ('res_id', '=', self.channel_1.id)])
        pending_messages = messages.filtered(lambda m: m.moderation_status == 'pending_moderation')
        accepted_messages = messages.filtered(lambda m: m.moderation_status == 'accepted')

        self.assertFalse(msg_email1)
        self.assertEqual(msg_admin, pending_messages)
        self.assertEqual(accepted_messages, msg_moderator | msg_email2 | msg_notif)
        self.assertFalse(msg_admin.channel_ids)
        self.assertEqual(msg_email2.channel_ids, self.channel_1)

    def test_user_is_moderator(self):
        self.assertTrue(self.user_employee.is_moderator)
        self.assertFalse(self.user_admin.is_moderator)
        self.channel_1.write({
            'channel_partner_ids': [(4, self.partner_admin.id)],
            'moderator_ids': [(4, self.user_admin.id)],
        })
        self.assertTrue(self.user_admin.is_moderator)

    def test_user_moderation_counter(self):
        self._add_messages(self.channel_1, 'B', moderation_status='pending_moderation', author=self.partner_admin)
        self._add_messages(self.channel_1, 'B', moderation_status='accepted', author=self.partner_admin)
        self._add_messages(self.channel_1, 'B', moderation_status='accepted', author=self.partner_employee)
        self._add_messages(self.channel_1, 'B', moderation_status='pending_moderation', author=self.partner_employee)
        self._add_messages(self.channel_1, 'B', moderation_status='accepted', author=self.partner_employee)

        self.assertEqual(self.user_employee.moderation_counter, 2)
        self.assertEqual(self.user_admin.moderation_counter, 0)

        self.channel_1.write({
            'channel_partner_ids': [(4, self.partner_admin.id)],
            'moderator_ids': [(4, self.user_admin.id)]
        })
        self.assertEqual(self.user_employee.moderation_counter, 2)
        self.assertEqual(self.user_admin.moderation_counter, 0)
