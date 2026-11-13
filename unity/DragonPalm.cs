using System.Collections.Generic;
using UnityEngine;

// Dragon palm force (models/wuxia/dragonPalm.glb). Clips: charge, fly (loop), impact.
// A hard, overwhelming palm wind: it rushes forward, smashes through every monster in its
// path (each is hit once, damaged and knocked back) and bursts when it reaches its range
// or hits a wall / the ground.
//   monsters (tag "Monster") get TakeDamage(damage) and Knockback(Vector3) via SendMessage,
//   and a push if they have a non-kinematic Rigidbody.
// Setup: import with glTFast (Animation Method = Legacy), add this component, save as a
// prefab and put it in MartialArts.palmPrefab.
// Not tested inside Unity by the author of this file: adjust if your project differs.
public class DragonPalm : MonoBehaviour
{
    public float speed = 12f;
    public float range = 9f;
    public float damage = 40f;
    public float knockback = 8f;
    public float hitRadius = 0.6f;
    public string monsterTag = "Monster";
    const float Lift = 1.0f; // the force sits 1.0 above the GLB root

    GameObject owner;
    Animation anim;
    readonly HashSet<GameObject> hit = new HashSet<GameObject>();
    float travelled;
    bool done;

    void Awake()
    {
        anim = GetComponentInChildren<Animation>();
        if (anim != null && anim["fly"] != null)
        {
            anim["fly"].wrapMode = WrapMode.Loop;
            anim.Play("fly");
        }
    }

    public void Launch(GameObject from, Vector3 position, Vector3 direction)
    {
        owner = from;
        var rot = Quaternion.LookRotation(direction, Vector3.up);
        transform.SetPositionAndRotation(position - rot * (Vector3.up * Lift), rot);
    }

    Vector3 Center => transform.position + transform.rotation * (Vector3.up * Lift);

    void Update()
    {
        if (done) return;
        float step = speed * Time.deltaTime;
        // stop at walls / ground (anything solid that is not a monster or the owner)
        if (Physics.SphereCast(Center, hitRadius * 0.5f, transform.forward, out var wall, step) && !IsMonster(wall.collider) && !IsOwner(wall.collider))
        {
            transform.position += transform.forward * wall.distance;
            Burst();
            return;
        }
        transform.position += transform.forward * step;
        travelled += step;
        foreach (var c in Physics.OverlapSphere(Center, hitRadius))
        {
            if (!IsMonster(c)) continue;
            var target = Root(c);
            if (!hit.Add(target)) continue;
            Vector3 push = (transform.forward + Vector3.up * 0.3f).normalized * knockback;
            target.SendMessage("TakeDamage", damage, SendMessageOptions.DontRequireReceiver);
            target.SendMessage("Knockback", push, SendMessageOptions.DontRequireReceiver);
            var body = c.attachedRigidbody;
            if (body != null && !body.isKinematic) body.AddForce(push, ForceMode.VelocityChange);
        }
        if (travelled >= range) Burst();
    }

    void Burst()
    {
        done = true;
        float wait = 0.9f;
        if (anim != null && anim["impact"] != null)
        {
            anim["impact"].wrapMode = WrapMode.ClampForever;
            anim.CrossFade("impact", 0.05f);
            wait = anim["impact"].length;
        }
        Destroy(gameObject, wait);
    }

    GameObject Root(Collider c) => c.attachedRigidbody != null ? c.attachedRigidbody.gameObject : c.gameObject;
    bool IsMonster(Collider c) => Root(c).CompareTag(monsterTag);
    bool IsOwner(Collider c) => owner != null && c.transform.IsChildOf(owner.transform);
}
