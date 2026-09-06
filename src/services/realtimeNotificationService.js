/**
 * Real-time Notifications Service for Rankly.ai HRMS
 * Uses Supabase Realtime (WebSockets) channels to broadcast live events
 * for Candidate applications, Leave requests, and Attendance tracking.
 */

const { EventEmitter } = require('events');
const supabase = require('../config/supabaseClient');

class RealtimeNotificationService extends EventEmitter {
  constructor() {
    super();
    this.channelName = 'rankly-hrms-notifications';
    this.supabaseChannel = null;
    this.initSupabaseChannel();
  }

  initSupabaseChannel() {
    try {
      if (supabase && typeof supabase.channel === 'function') {
        this.supabaseChannel = supabase.channel(this.channelName);
        this.supabaseChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`📡 [Realtime] Supabase Realtime channel "${this.channelName}" connected successfully.`);
          }
        });
      }
    } catch (err) {
      console.warn('⚠️ [Realtime] Supabase Realtime channel setup warning:', err.message);
    }
  }

  setSocketIo(io) {
    this.io = io;
  }

  /**
   * Broadcast an event to Supabase Realtime, Socket.IO, and internal EventEmitters
   * @param {string} event - Event name (e.g. 'candidate_applied', 'leave_requested')
   * @param {Object} payload - Notification payload
   */
  async broadcast(event, payload) {
    const notification = {
      event,
      timestamp: new Date().toISOString(),
      payload
    };

    // 1. Emit locally via EventEmitter
    this.emit(event, notification);
    this.emit('*', notification);

    // 2. Broadcast via Socket.IO if attached (for instant local / cloud web clients)
    try {
      if (this.io && typeof this.io.emit === 'function') {
        this.io.emit(event, notification.payload);
        this.io.emit('notification', notification);
      }
    } catch (ioErr) {
      console.warn(`⚠️ [Realtime] Socket.IO broadcast warning for "${event}":`, ioErr.message);
    }

    // 3. Broadcast over Supabase Realtime WebSocket channel if available
    try {
      if (this.supabaseChannel && typeof this.supabaseChannel.send === 'function') {
        await this.supabaseChannel.send({
          type: 'broadcast',
          event: event,
          payload: notification
        });
      }
    } catch (err) {
      console.warn(`⚠️ [Realtime] Failed to broadcast "${event}" on Supabase channel:`, err.message);
    }

    return notification;
  }

  /**
   * Trigger live event when a new candidate applies
   */
  async notifyCandidateApplied(data) {
    return this.broadcast('candidate_applied', {
      title: '🎯 New Candidate Application Received',
      candidateName: data.name || data.fullName || 'New Applicant',
      email: data.email,
      targetRole: data.targetRole || data.jobTitle || 'General',
      score: data.score || data.matchScore || 0,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Trigger live event when an employee applies for leave
   */
  async notifyLeaveRequested(data) {
    return this.broadcast('leave_requested', {
      title: '📅 New Leave Request Submitted',
      employeeId: data.employee_id || data.employeeId,
      employeeName: data.full_name || data.employeeName || 'Staff Member',
      leaveType: data.leave_type || data.leaveType,
      startDate: data.start_date || data.startDate,
      endDate: data.end_date || data.endDate,
      workingDays: data.days_count || data.daysCount,
      reason: data.reason,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Trigger live event when leave request status is reviewed
   */
  async notifyLeaveReviewed(data) {
    return this.broadcast('leave_status_updated', {
      title: `📋 Leave Request ${String(data.status).toUpperCase()}`,
      leaveId: data.id,
      employeeId: data.employee_id,
      status: data.status,
      reviewedBy: data.reviewed_by,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Trigger live event when employee punches in/out
   */
  async notifyAttendanceEvent(data) {
    return this.broadcast('attendance_punched', {
      title: `⏱️ Attendance ${data.type === 'check_in' ? 'Punch In' : 'Punch Out'}`,
      employeeId: data.employee_id,
      type: data.type,
      time: new Date().toISOString()
    });
  }
}

module.exports = new RealtimeNotificationService();
