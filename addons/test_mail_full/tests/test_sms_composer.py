# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo.addons.test_mail_full.tests import common as test_mail_full_common
from odoo.tests import tagged


@tagged('post_install', '-at_install')
class TestSMSComposerComment(test_mail_full_common.TestSMSCommon, test_mail_full_common.TestRecipients):
    """ TODO LIST

     * add test for default_res_model / default_res_id and stuff like that;
     * add test for comment put in queue;
     * add test for language support (set template lang context);
     * add test for sanitized / wrong numbers;
    """

    @classmethod
    def setUpClass(cls):
        super(TestSMSComposerComment, cls).setUpClass()
        cls._test_body = 'VOID CONTENT'

        cls.test_record = cls.env['mail.test.sms'].with_context(**cls._test_context).create({
            'name': 'Test',
            'customer_id': cls.partner_1.id,
            'mobile_nbr': cls.test_numbers[0],
            'phone_nbr': cls.test_numbers[1],
        })
        cls.test_record = cls._reset_mail_context(cls.test_record)

        cls.sms_template = cls.env['sms.template'].create({
            'name': 'Test Template',
            'model_id': cls.env['ir.model']._get('mail.test.sms').id,
            'body': 'Dear ${object.display_name} this is an SMS.',
        })

    def test_composer_comment_not_mail_thread(self):
        with self.with_user('employee'):
            record = self.env['test_performance.base'].create({'name': 'TestBase'})
            composer = self.env['sms.composer'].with_context(
                active_model='test_performance.base', active_id=record.id
            ).create({
                'body': self._test_body,
                'numbers': ','.join(self.random_numbers),
            })

            with self.mockSMSGateway():
                composer._action_send_sms()

        self.assertSMSSent(self.random_numbers_san, self._test_body)

    def test_composer_comment_default(self):
        with self.with_user('employee'):
            composer = self.env['sms.composer'].with_context(
                active_model='mail.test.sms', active_id=self.test_record.id
            ).create({
                'body': self._test_body,
            })

            with self.mockSMSGateway():
                messages = composer._action_send_sms()

        self.assertSMSNotification([{'partner': self.test_record.customer_id, 'number': self.test_numbers_san[1]}], self._test_body, messages)

    def test_composer_comment_field_1(self):
        with self.with_user('employee'):
            composer = self.env['sms.composer'].with_context(
                active_model='mail.test.sms', active_id=self.test_record.id,
            ).create({
                'body': self._test_body,
                'number_field_name': 'mobile_nbr',
            })

            with self.mockSMSGateway():
                messages = composer._action_send_sms()

        self.assertSMSNotification([{'partner': self.test_record.customer_id, 'number': self.test_numbers_san[0]}], self._test_body, messages)

    def test_composer_comment_field_2(self):
        with self.with_user('employee'):
            composer = self.env['sms.composer'].with_context(
                active_model='mail.test.sms', active_id=self.test_record.id,
            ).create({
                'body': self._test_body,
                'number_field_name': 'phone_nbr',
            })

            with self.mockSMSGateway():
                messages = composer._action_send_sms()

        self.assertSMSNotification([{'partner': self.test_record.customer_id, 'number': self.test_numbers_san[1]}], self._test_body, messages)

    def test_composer_comment_field_w_numbers(self):
        with self.with_user('employee'):
            composer = self.env['sms.composer'].with_context(
                active_model='mail.test.sms', active_id=self.test_record.id,
                default_number_field_name='mobile_nbr',
            ).create({
                'body': self._test_body,
                'numbers': ','.join(self.random_numbers),
            })

            with self.mockSMSGateway():
                messages = composer._action_send_sms()

        self.assertSMSNotification([
            {'partner': self.test_record.customer_id, 'number': self.test_record.mobile_nbr},
            {'number': self.random_numbers_san[0]}, {'number': self.random_numbers_san[1]}], self._test_body, messages)

    def test_composer_comment_field_w_template(self):
        with self.with_user('employee'):
            composer = self.env['sms.composer'].with_context(
                active_model='mail.test.sms', active_id=self.test_record.id,
                default_template_id=self.sms_template.id,
                default_number_field_name='mobile_nbr',
            ).create({})

            with self.mockSMSGateway():
                messages = composer._action_send_sms()

        self.assertSMSNotification([{'partner': self.test_record.customer_id, 'number': self.test_record.mobile_nbr}], 'Dear %s this is an SMS.' % self.test_record.display_name, messages)

    def test_composer_numbers_no_model(self):
        with self.with_user('employee'):
            composer = self.env['sms.composer'].with_context(
                default_composition_mode='numbers'
            ).create({
                'body': self._test_body,
                'numbers': ','.join(self.random_numbers),
            })

            with self.mockSMSGateway():
                composer._action_send_sms()
        self.assertSMSSent(self.random_numbers_san, self._test_body)


@tagged('post_install', '-at_install')
class TestSMSComposerBatch(test_mail_full_common.TestSMSCommon):
    @classmethod
    def setUpClass(cls):
        super(TestSMSComposerBatch, cls).setUpClass()
        cls._test_body = 'Zizisse an SMS.'

        cls._create_records_for_batch('mail.test.sms', 3)
        cls.sms_template = cls._create_sms_template('mail.test.sms')

    def test_composer_batch_active_domain(self):
        with self.with_user('employee'):
            composer = self.env['sms.composer'].with_context(
                default_composition_mode='comment',
                default_res_model='mail.test.sms',
                default_use_active_domain=True,
                active_domain=[('id', 'in', self.records.ids)],
            ).create({
                'body': self._test_body,
            })

            with self.mockSMSGateway():
                messages = composer._action_send_sms()

        for record in self.records:
            self.assertSMSNotification([{'partner': r.customer_id} for r in self.records], 'Zizisse an SMS.', messages)

    def test_composer_batch_active_ids(self):
        with self.with_user('employee'):
            composer = self.env['sms.composer'].with_context(
                default_composition_mode='comment',
                default_res_model='mail.test.sms',
                active_ids=self.records.ids
            ).create({
                'body': self._test_body,
            })

            with self.mockSMSGateway():
                messages = composer._action_send_sms()

        for record in self.records:
            self.assertSMSNotification([{'partner': r.customer_id} for r in self.records], 'Zizisse an SMS.', messages)

    def test_composer_batch_domain(self):
        with self.with_user('employee'):
            composer = self.env['sms.composer'].with_context(
                default_composition_mode='comment',
                default_res_model='mail.test.sms',
                default_use_active_domain=True,
                default_active_domain=repr([('id', 'in', self.records.ids)]),
            ).create({
                'body': self._test_body,
            })

            with self.mockSMSGateway():
                messages = composer._action_send_sms()

        for record in self.records:
            self.assertSMSNotification([{'partner': r.customer_id} for r in self.records], 'Zizisse an SMS.', messages)

    def test_composer_batch_res_ids(self):
        with self.with_user('employee'):
            composer = self.env['sms.composer'].with_context(
                default_composition_mode='comment',
                default_res_model='mail.test.sms',
                default_res_ids=repr(self.records.ids),
            ).create({
                'body': self._test_body,
            })

            with self.mockSMSGateway():
                messages = composer._action_send_sms()

        for record in self.records:
            self.assertSMSNotification([{'partner': r.customer_id} for r in self.records], 'Zizisse an SMS.', messages)


@tagged('post_install', '-at_install')
class TestSMSComposerMass(test_mail_full_common.TestSMSCommon):

    @classmethod
    def setUpClass(cls):
        super(TestSMSComposerMass, cls).setUpClass()
        cls._test_body = 'Zizisse an SMS.'

        cls._create_records_for_batch('mail.test.sms', 3)
        cls.sms_template = cls._create_sms_template('mail.test.sms')

    def test_composer_mass_active_domain(self):
        with self.with_user('employee'):
            composer = self.env['sms.composer'].with_context(
                default_composition_mode='mass',
                default_res_model='mail.test.sms',
                default_use_active_domain=True,
                active_domain=[('id', 'in', self.records.ids)],
            ).create({
                'body': self._test_body,
                'mass_keep_log': False,
            })

            with self.mockSMSGateway():
                composer.action_send_sms()

        for record in self.records:
            self.assertSMSOutgoing(record.customer_id, None, self._test_body)

    def test_composer_mass_active_domain_w_template(self):
        with self.with_user('employee'):
            composer = self.env['sms.composer'].with_context(
                default_composition_mode='mass',
                default_res_model='mail.test.sms',
                default_use_active_domain=True,
                active_domain=[('id', 'in', self.records.ids)],
                default_template_id=self.sms_template.id,
            ).create({
                'mass_keep_log': False,
            })

            with self.mockSMSGateway():
                composer.action_send_sms()

        for record in self.records:
            self.assertSMSOutgoing(record.customer_id, None, 'Dear %s this is an SMS.' % record.display_name)

    def test_composer_mass_active_ids(self):
        with self.with_user('employee'):
            composer = self.env['sms.composer'].with_context(
                default_composition_mode='mass',
                default_res_model='mail.test.sms',
                active_ids=self.records.ids,
            ).create({
                'body': self._test_body,
                'mass_keep_log': False,
            })

            with self.mockSMSGateway():
                composer.action_send_sms()

        for partner in self.partners:
            self.assertSMSOutgoing(partner, None, self._test_body)

    def test_composer_mass_active_ids_w_blacklist(self):
        self.env['phone.blacklist'].create([{
            'number': p.phone_sanitized,
            'active': True,
        } for p in self.partners[:5]])

        with self.with_user('employee'):
            composer = self.env['sms.composer'].with_context(
                default_composition_mode='mass',
                default_res_model='mail.test.sms',
                active_ids=self.records.ids,
            ).create({
                'body': self._test_body,
                'mass_keep_log': False,
                'mass_use_blacklist': True,
            })

            with self.mockSMSGateway():
                composer.action_send_sms()

        for partner in self.partners[5:]:
            self.assertSMSOutgoing(partner, partner.phone_sanitized, content=self._test_body)
        for partner in self.partners[:5]:
            self.assertSMSCanceled(partner, partner.phone_sanitized, 'sms_blacklist', content=self._test_body)

    def test_composer_mass_active_ids_wo_blacklist(self):
        self.env['phone.blacklist'].create([{
            'number': p.phone_sanitized,
            'active': True,
        } for p in self.partners[:5]])

        with self.with_user('employee'):
            composer = self.env['sms.composer'].with_context(
                default_composition_mode='mass',
                default_res_model='mail.test.sms',
                active_ids=self.records.ids,
            ).create({
                'body': self._test_body,
                'mass_keep_log': False,
                'mass_use_blacklist': False,
            })

            with self.mockSMSGateway():
                composer.action_send_sms()

        for partner in self.partners:
            self.assertSMSOutgoing(partner, partner.phone_sanitized, content=self._test_body)

    def test_composer_mass_active_ids_w_blacklist_and_done(self):
        self.env['phone.blacklist'].create([{
            'number': p.phone_sanitized,
            'active': True,
        } for p in self.partners[:5]])
        for p in self.partners[8:]:
            p.mobile = self.partners[8].mobile
            self.assertEqual(p.phone_sanitized, self.partners[8].phone_sanitized)

        with self.with_user('employee'):
            composer = self.env['sms.composer'].with_context(
                default_composition_mode='mass',
                default_res_model='mail.test.sms',
                active_ids=self.records.ids,
            ).create({
                'body': self._test_body,
                'mass_keep_log': False,
                'mass_use_blacklist': True,
            })

            with self.mockSMSGateway():
                composer.action_send_sms()

        for partner in self.partners[8:]:
            self.assertSMSOutgoing(partner, partner.phone_sanitized, content=self._test_body)
        for partner in self.partners[5:8]:
            self.assertSMSCanceled(partner, partner.phone_sanitized, 'sms_duplicate', content=self._test_body)
        for partner in self.partners[:5]:
            self.assertSMSCanceled(partner, partner.phone_sanitized, 'sms_blacklist', content=self._test_body)

    def test_composer_mass_active_ids_w_template(self):
        with self.with_user('employee'):
            composer = self.env['sms.composer'].with_context(
                default_composition_mode='mass',
                default_res_model='mail.test.sms',
                active_ids=self.records.ids,
                default_template_id=self.sms_template.id,
            ).create({
                'mass_keep_log': False,
            })

            with self.mockSMSGateway():
                composer.action_send_sms()

        for record in self.records:
            self.assertSMSOutgoing(record.customer_id, None, 'Dear %s this is an SMS.' % record.display_name)

    def test_composer_mass_active_ids_w_template_and_lang(self):
        self.env['res.lang']._activate_lang('fr_FR')
        self.env['ir.translation'].create({
            'type': 'model',
            'name': 'sms.template,body',
            'lang': 'fr_FR',
            'res_id': self.sms_template.id,
            'src': self.sms_template.body,
            'value': 'Cher·e· ${object.display_name} ceci est un SMS.',
        })
        # set template to try to use customer lang
        self.sms_template.write({
            'lang': '${object.customer_id.lang}',
        })
        # set one customer as french speaking
        self.partners[2].write({'lang': 'fr_FR'})

        with self.with_user('employee'):
            composer = self.env['sms.composer'].with_context(
                default_composition_mode='mass',
                default_res_model='mail.test.sms',
                active_ids=self.records.ids,
                default_template_id=self.sms_template.id,
            ).create({
                'mass_keep_log': False,
            })

            with self.mockSMSGateway():
                composer.action_send_sms()

        for record in self.records:
            if record.customer_id == self.partners[2]:
                self.assertSMSOutgoing(record.customer_id, None, 'Cher·e· %s ceci est un SMS.' % record.display_name)
            else:
                self.assertSMSOutgoing(record.customer_id, None, 'Dear %s this is an SMS.' % record.display_name)

    def test_composer_mass_active_ids_w_template_and_log(self):
        with self.with_user('employee'):
            composer = self.env['sms.composer'].with_context(
                default_composition_mode='mass',
                default_res_model='mail.test.sms',
                active_ids=self.records.ids,
                default_template_id=self.sms_template.id,
            ).create({
                'mass_keep_log': True,
            })

            with self.mockSMSGateway():
                composer.action_send_sms()

        for record in self.records:
            self.assertSMSOutgoing(record.customer_id, None, 'Dear %s this is an SMS.' % record.display_name)
            self.assertSMSLogged(record, 'Dear %s this is an SMS.' % record.display_name)

    def test_composer_template_context_action(self):
        """ Test the context action from a SMS template (Add context action button)
        and the usage with the sms composer """
        # Create the lang info
        self.env['res.lang']._activate_lang('fr_FR')
        self.env['ir.translation'].create({
            'type': 'model',
            'name': 'sms.template,body',
            'lang': 'fr_FR',
            'res_id': self.sms_template.id,
            'src': self.sms_template.body,
            'value': "Hello ${object.display_name} ceci est en français.",
        })
        # set template to try to use customer lang
        self.sms_template.write({
            'lang': '${object.customer_id.lang}',
        })
        # create a second record linked to a customer in another language
        self.partners[2].write({'lang': 'fr_FR'})
        test_record_2 = self.env['mail.test.sms'].create({
            'name': 'Test',
            'customer_id': self.partners[2].id,
        })
        test_record_1 = self.env['mail.test.sms'].create({
            'name': 'Test',
            'customer_id': self.partners[1].id,
        })
        # Composer creation with context from a template context action (simulate) - comment (single recipient)
        with self.with_user('employee'):
            composer = self.env['sms.composer'].with_context(
                default_composition_mode='guess',
                default_res_ids=[test_record_2.id],
                default_res_id=test_record_2.id,
                active_ids=[test_record_2.id],
                active_id=test_record_2.id,
                active_model='mail.test.sms',
                default_template_id=self.sms_template.id,
            ).create({
                'mass_keep_log': False,
            })
            # Call manually the onchange
            composer._onchange_template_id()
            self.assertEqual(composer.composition_mode, "comment")
            self.assertEqual(composer.body, "Hello %s ceci est en français." % test_record_2.display_name)

            with self.mockSMSGateway():
                messages = composer._action_send_sms()

        number = self.partners[2].phone_get_sanitized_number()
        self.assertSMSNotification([{'partner': test_record_2.customer_id, 'number': number}], "Hello %s ceci est en français." % test_record_2.display_name, messages)

        # Composer creation with context from a template context action (simulate) - mass (multiple recipient)
        with self.with_user('employee'):
            composer = self.env['sms.composer'].with_context(
                default_composition_mode='guess',
                default_res_ids=[test_record_1.id, test_record_2.id],
                default_res_id=test_record_1.id,
                active_ids=[test_record_1.id, test_record_2.id],
                active_id=test_record_1.id,
                active_model='mail.test.sms',
                default_template_id=self.sms_template.id,
            ).create({
                'mass_keep_log': True,
            })
            # Call manually the onchange
            composer._onchange_template_id()
            self.assertEqual(composer.composition_mode, "mass")
            # In english because by default but when sinding depending of record
            self.assertEqual(composer.body, "Dear ${object.display_name} this is an SMS.")

            with self.mockSMSGateway():
                composer.action_send_sms()

        self.assertSMSOutgoing(test_record_1.customer_id, None, 'Dear %s this is an SMS.' % test_record_1.display_name)
        self.assertSMSOutgoing(test_record_2.customer_id, None, "Hello %s ceci est en français." % test_record_2.display_name)
