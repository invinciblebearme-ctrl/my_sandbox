using UnityEngine;

// Player item exported by the monster viewer (models/<theme>/items/*.glb).
// Node layout: Item (root) > pickupRing, item (grip point at its origin).
// Clips: idle (floating on the ground), use (swing / recoil / throw / drink ...).
//
// Setup: import the .glb with glTFast (Animation Method = Legacy), put it in the
// scene, add this component and a trigger collider. Call PickUp(hand) from your
// player code, then Use() when the player uses the item.
// Not tested inside Unity by the author of this file: adjust if your project differs.
public class PlayerItem : MonoBehaviour
{
    public float crossFade = 0.1f;

    // Player clips for this item, from models/items.json (used by PlayerAnimations.Equip)
    public string playerHold = "idle";
    public string playerUse = "";
    public string playerMove = "walk";

    Animation anim;
    Transform itemNode;
    Transform ring;

    void Awake()
    {
        anim = GetComponentInChildren<Animation>();
        itemNode = FindDeep(transform, "item");
        ring = FindDeep(transform, "pickupRing");
        if (anim != null && anim["idle"] != null)
        {
            anim["idle"].wrapMode = WrapMode.Loop;
            anim.Play("idle");
        }
    }

    // Attach the item to the player's hand and stop the floating animation.
    public void PickUp(Transform hand)
    {
        if (anim != null) anim.Stop();
        if (ring != null) ring.gameObject.SetActive(false);
        if (itemNode == null) return;
        itemNode.SetParent(hand, false);
        itemNode.localPosition = Vector3.zero;
        itemNode.localRotation = Quaternion.identity;
    }

    // Plays the "use" clip once. The clip animates the `item` node, so it only
    // plays while the item is still under this object's Animation component;
    // once held, drive the swing from the player's own animation instead.
    public void Use()
    {
        if (anim == null || anim["use"] == null) return;
        anim["use"].wrapMode = WrapMode.Once;
        anim.CrossFade("use", crossFade);
    }

    static Transform FindDeep(Transform t, string name)
    {
        if (t.name == name) return t;
        foreach (Transform c in t)
        {
            var r = FindDeep(c, name);
            if (r != null) return r;
        }
        return null;
    }
}
